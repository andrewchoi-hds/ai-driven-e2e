import * as Diff from 'diff';
import { getAIClient, type AIClient } from '../../core/ai-client.js';
import { DOMParser } from '../../core/dom-parser.js';
import { getSnapshotManager, type SnapshotManager } from '../../core/snapshot-manager.js';
import { type AgentHandler } from '../coordinator/index.js';

export interface AnalysisAgentConfig {
  verbose?: boolean;
  flakyThreshold?: number;
}

export type AnalysisTask =
  | 'analyze_failure'
  | 'compare_runs'
  | 'detect_flaky'
  | 'analyze_performance';

export interface TestRun {
  id: string;
  timestamp: Date;
  results: TestResult[];
  duration: number;
}

export interface TestResult {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  timestamp?: Date;
  error?: {
    message: string;
    stack?: string;
  };
  retries?: number;
}

export interface FailureAnalysis {
  testName: string;
  rootCause: {
    category: 'selector' | 'timing' | 'data' | 'environment' | 'logic' | 'unknown';
    description: string;
    confidence: number;
  };
  suggestedFix: string;
  relatedChanges: {
    type: 'code' | 'dom' | 'config';
    description: string;
  }[];
  historicalContext: {
    lastSuccess: Date | null;
    failureCount: number;
    pattern: string;
  };
}

export interface FlakyTestReport {
  tests: {
    name: string;
    file: string;
    flakyScore: number;
    passRate: number;
    avgRetries: number;
    suggestion: string;
  }[];
  summary: {
    totalFlaky: number;
    highRisk: number;
    mediumRisk: number;
  };
}

export interface RunComparison {
  summary: {
    newFailures: number;
    fixedTests: number;
    newTests: number;
    removedTests: number;
    durationChange: string;
  };
  details: {
    newFailures: TestResult[];
    fixed: TestResult[];
    stillFailing: TestResult[];
    newTests: TestResult[];
  };
  analysis: string;
}

export class AnalysisAgent {
  private aiClient: AIClient;
  private snapshotManager: SnapshotManager;
  private verbose: boolean;
  private flakyThreshold: number;
  private testHistory: Map<string, TestResult[]> = new Map();

  constructor(config: AnalysisAgentConfig = {}) {
    this.aiClient = getAIClient();
    this.snapshotManager = getSnapshotManager();
    this.verbose = config.verbose ?? false;
    this.flakyThreshold = config.flakyThreshold ?? 0.1;
  }

  /**
   * 테스트 실패 상세 분석
   */
  async analyzeFailure(params: {
    testResult: TestResult;
    codeContext?: string;
    domSnapshot?: string;
    previousDom?: string;
  }): Promise<FailureAnalysis> {
    this.log(`Analyzing failure: ${params.testResult.name}`);

    const { testResult, codeContext, domSnapshot, previousDom } = params;

    // DOM 변경 분석
    let domChanges: string[] = [];
    if (domSnapshot && previousDom) {
      const comparison = DOMParser.compareDOMs(previousDom, domSnapshot);
      domChanges = [
        ...comparison.added.map((e) => `Added: ${e.tag} at ${e.cssPath}`),
        ...comparison.removed.map((e) => `Removed: ${e.tag} at ${e.cssPath}`),
        ...comparison.modified.map((m) => `Modified: ${m.changes.join(', ')}`),
      ];
    }

    // 히스토리 분석
    const history = this.testHistory.get(testResult.name) || [];
    const lastSuccess = history.findLast((r) => r.status === 'passed');
    const recentFailures = history.filter((r) => r.status === 'failed').length;

    // AI 분석 요청
    const prompt = `Analyze this test failure and determine the root cause.

## Test Information
- Name: ${testResult.name}
- File: ${testResult.file}
- Error: ${testResult.error?.message || 'No error message'}
- Stack: ${testResult.error?.stack?.slice(0, 500) || 'No stack trace'}

## Code Context
${codeContext || 'Not available'}

## DOM Changes
${domChanges.length > 0 ? domChanges.join('\n') : 'No DOM changes detected'}

## History
- Last success: ${lastSuccess?.timestamp || 'Never'}
- Recent failures: ${recentFailures}

## Analyze and provide:
1. Root cause category (selector/timing/data/environment/logic/unknown)
2. Detailed description of the issue
3. Suggested fix
4. Confidence level (0-1)

Respond in JSON format:
{
  "category": "...",
  "description": "...",
  "suggestedFix": "...",
  "confidence": 0.85
}`;

    const response = await this.aiClient.complete(prompt, {
      system: 'You are an expert test failure analyst. Provide precise, actionable analysis.',
      maxTokens: 1024,
    });

    let analysis = {
      category: 'unknown' as const,
      description: 'Unable to determine root cause',
      suggestedFix: 'Manual investigation required',
      confidence: 0.3,
    };

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        analysis = {
          category: parsed.category || 'unknown',
          description: parsed.description || analysis.description,
          suggestedFix: parsed.suggestedFix || analysis.suggestedFix,
          confidence: parsed.confidence || analysis.confidence,
        };
      } catch {
        // 파싱 실패
      }
    }

    return {
      testName: testResult.name,
      rootCause: {
        category: analysis.category,
        description: analysis.description,
        confidence: analysis.confidence,
      },
      suggestedFix: analysis.suggestedFix,
      relatedChanges: domChanges.map((d) => ({
        type: 'dom' as const,
        description: d,
      })),
      historicalContext: {
        lastSuccess: lastSuccess ? new Date(lastSuccess.timestamp || Date.now()) : null,
        failureCount: recentFailures,
        pattern: this.detectFailurePattern(history),
      },
    };
  }

  /**
   * 두 테스트 실행 비교
   */
  async compareRuns(before: TestRun, after: TestRun): Promise<RunComparison> {
    this.log('Comparing test runs');

    const beforeMap = new Map(before.results.map((r) => [r.name, r]));
    const afterMap = new Map(after.results.map((r) => [r.name, r]));

    const newFailures: TestResult[] = [];
    const fixed: TestResult[] = [];
    const stillFailing: TestResult[] = [];
    const newTests: TestResult[] = [];

    for (const [name, result] of afterMap) {
      const prev = beforeMap.get(name);

      if (!prev) {
        newTests.push(result);
      } else if (prev.status === 'passed' && result.status === 'failed') {
        newFailures.push(result);
      } else if (prev.status === 'failed' && result.status === 'passed') {
        fixed.push(result);
      } else if (prev.status === 'failed' && result.status === 'failed') {
        stillFailing.push(result);
      }
    }

    const removedTests = [...beforeMap.keys()].filter((name) => !afterMap.has(name));

    const durationDiff = after.duration - before.duration;
    const durationChange = durationDiff > 0
      ? `+${(durationDiff / 1000).toFixed(1)}s`
      : `${(durationDiff / 1000).toFixed(1)}s`;

    // AI로 분석 요약 생성
    const analysisPrompt = `Summarize this test run comparison:
- New failures: ${newFailures.length}
- Fixed tests: ${fixed.length}
- Still failing: ${stillFailing.length}
- New tests: ${newTests.length}
- Duration change: ${durationChange}

New failures: ${newFailures.map((t) => t.name).join(', ') || 'None'}
Fixed: ${fixed.map((t) => t.name).join(', ') || 'None'}

Provide a brief, actionable summary.`;

    const analysisResponse = await this.aiClient.complete(analysisPrompt, {
      system: 'You are a QA analyst. Provide concise, actionable test run analysis.',
      maxTokens: 512,
    });

    return {
      summary: {
        newFailures: newFailures.length,
        fixedTests: fixed.length,
        newTests: newTests.length,
        removedTests: removedTests.length,
        durationChange,
      },
      details: {
        newFailures,
        fixed,
        stillFailing,
        newTests,
      },
      analysis: analysisResponse,
    };
  }

  /**
   * Flaky 테스트 탐지
   */
  async detectFlakyTests(runs: TestRun[]): Promise<FlakyTestReport> {
    this.log('Detecting flaky tests');

    const testStats = new Map<string, {
      passes: number;
      failures: number;
      totalRetries: number;
      runs: number;
    }>();

    // 통계 수집
    for (const run of runs) {
      for (const result of run.results) {
        const stats = testStats.get(result.name) || {
          passes: 0,
          failures: 0,
          totalRetries: 0,
          runs: 0,
        };

        stats.runs++;
        if (result.status === 'passed') stats.passes++;
        if (result.status === 'failed') stats.failures++;
        if (result.retries) stats.totalRetries += result.retries;

        testStats.set(result.name, stats);
      }
    }

    // Flaky 점수 계산
    const flakyTests: FlakyTestReport['tests'] = [];

    for (const [name, stats] of testStats) {
      if (stats.runs < 2) continue;

      const passRate = stats.passes / stats.runs;
      const avgRetries = stats.totalRetries / stats.runs;

      // Flaky 점수: 통과율이 0%~100% 사이이고 변동이 있는 경우
      // 50%에 가까울수록 더 flaky
      const flakyScore = 1 - Math.abs(passRate - 0.5) * 2;

      if (flakyScore > this.flakyThreshold) {
        flakyTests.push({
          name,
          file: runs[0].results.find((r) => r.name === name)?.file || 'unknown',
          flakyScore,
          passRate,
          avgRetries,
          suggestion: this.generateFlakySuggestion(flakyScore, passRate, avgRetries),
        });
      }
    }

    // 정렬 (가장 flaky한 것부터)
    flakyTests.sort((a, b) => b.flakyScore - a.flakyScore);

    const highRisk = flakyTests.filter((t) => t.flakyScore > 0.7).length;
    const mediumRisk = flakyTests.filter((t) => t.flakyScore > 0.4 && t.flakyScore <= 0.7).length;

    return {
      tests: flakyTests,
      summary: {
        totalFlaky: flakyTests.length,
        highRisk,
        mediumRisk,
      },
    };
  }

  /**
   * 테스트 히스토리 기록
   */
  recordTestResult(result: TestResult): void {
    const history = this.testHistory.get(result.name) || [];
    history.push(result);

    // 최근 100개만 유지
    if (history.length > 100) {
      history.shift();
    }

    this.testHistory.set(result.name, history);
  }

  /**
   * Agent Coordinator용 핸들러
   */
  toHandler(): AgentHandler {
    return {
      type: 'analysis',
      execute: async (task: string, params: Record<string, unknown>) => {
        switch (task) {
          case 'analyze_failure':
            return this.analyzeFailure(params as Parameters<typeof this.analyzeFailure>[0]);
          case 'compare_runs':
            return this.compareRuns(
              params.before as TestRun,
              params.after as TestRun
            );
          case 'detect_flaky':
            return this.detectFlakyTests(params.runs as TestRun[]);
          default:
            throw new Error(`Unknown analysis task: ${task}`);
        }
      },
    };
  }

  private detectFailurePattern(history: TestResult[]): string {
    if (history.length < 5) return 'Insufficient data';

    const recent = history.slice(-10);
    const failureRate = recent.filter((r) => r.status === 'failed').length / recent.length;

    if (failureRate > 0.8) return 'Consistently failing';
    if (failureRate > 0.4) return 'Intermittent failures';
    if (failureRate > 0.1) return 'Occasional failures';
    return 'Mostly stable';
  }

  private generateFlakySuggestion(flakyScore: number, passRate: number, avgRetries: number): string {
    const suggestions: string[] = [];

    if (flakyScore > 0.7) {
      suggestions.push('High flakiness - investigate immediately');
    }

    if (avgRetries > 1) {
      suggestions.push('Consider adding explicit waits or retrying specific assertions');
    }

    if (passRate < 0.5) {
      suggestions.push('Test fails more often than passes - may have underlying issues');
    }

    if (passRate > 0.8 && flakyScore > 0.3) {
      suggestions.push('Occasional failures - check for race conditions or external dependencies');
    }

    return suggestions.join('. ') || 'Monitor for patterns';
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[Analysis Agent] ${message}`);
    }
  }
}

export function createAnalysisAgent(config?: AnalysisAgentConfig): AnalysisAgent {
  return new AnalysisAgent(config);
}
