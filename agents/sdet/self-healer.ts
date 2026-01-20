import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { getAIClient, type AIClient } from '../../core/ai-client.js';
import { DOMParser } from '../../core/dom-parser.js';
import { getSnapshotManager, type SnapshotManager } from '../../core/snapshot-manager.js';
import { SELF_HEAL_SYSTEM_PROMPT, SELF_HEAL_ANALYSIS_PROMPT, SELECTOR_HEAL_PROMPT } from './prompts/heal.prompt.js';

export interface HealerConfig {
  aiClient?: AIClient;
  snapshotManager?: SnapshotManager;
  maxRetries?: number;
  autoApply?: boolean;
}

export interface TestFailure {
  testFile: string;
  testName: string;
  failedLine: number;
  errorMessage: string;
  errorStack?: string;
  selector?: string;
  url?: string;
}

export interface HealResult {
  success: boolean;
  analysis: FailureAnalysis;
  fix?: ProposedFix;
  appliedChanges?: string;
}

export interface FailureAnalysis {
  rootCause: {
    type: 'selector_changed' | 'timing' | 'element_removed' | 'logic_error' | 'unknown';
    description: string;
    confidence: number;
  };
  affectedCode: {
    file: string;
    line: number;
    original: string;
  };
  domChanges?: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}

export interface ProposedFix {
  correctedCode: string;
  explanation: string;
  locatorStrategy: string;
  alternatives?: {
    code: string;
    pros: string[];
    cons: string[];
  }[];
  prevention?: string[];
}

const AnalysisResponseSchema = z.object({
  rootCause: z.object({
    type: z.enum(['selector_changed', 'timing', 'element_removed', 'logic_error', 'unknown']),
    description: z.string(),
    confidence: z.number(),
  }),
  fix: z.object({
    correctedCode: z.string(),
    explanation: z.string(),
    locatorStrategy: z.string(),
  }),
  alternatives: z.array(z.object({
    code: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
  })).optional(),
  prevention: z.array(z.string()).optional(),
});

export class SelfHealer {
  private aiClient: AIClient;
  private snapshotManager: SnapshotManager;
  private config: Required<HealerConfig>;

  constructor(config: HealerConfig = {}) {
    this.aiClient = config.aiClient || getAIClient();
    this.snapshotManager = config.snapshotManager || getSnapshotManager();
    this.config = {
      aiClient: this.aiClient,
      snapshotManager: this.snapshotManager,
      maxRetries: config.maxRetries ?? 3,
      autoApply: config.autoApply ?? false,
    };
  }

  /**
   * 테스트 실패 분석 및 자동 복구
   */
  async heal(failure: TestFailure): Promise<HealResult> {
    // 1. 테스트 파일 읽기
    const testCode = await this.readTestFile(failure.testFile);
    const failedLineCode = this.extractLineContext(testCode, failure.failedLine);

    // 2. DOM 스냅샷 비교 (가능한 경우)
    let previousDom = '';
    let currentDom = '';
    let domChanges: FailureAnalysis['domChanges'];

    if (failure.url) {
      const latestSnapshot = await this.snapshotManager.getLatest(failure.url);
      const previousSnapshot = await this.snapshotManager.getPrevious(failure.url);

      currentDom = latestSnapshot?.html || '';
      previousDom = previousSnapshot?.html || '';

      if (currentDom && previousDom) {
        const comparison = DOMParser.compareDOMs(previousDom, currentDom);
        domChanges = {
          added: comparison.added.map((e) => e.cssPath),
          removed: comparison.removed.map((e) => e.cssPath),
          modified: comparison.modified.map((m) => `${m.before.cssPath}: ${m.changes.join(', ')}`),
        };
      }
    }

    // 3. AI 분석 요청
    const analysis = await this.analyzeFailure({
      failure,
      testCode: failedLineCode,
      currentDom,
      previousDom,
    });

    // 4. 수정 제안 생성
    const fix = analysis.fix;

    // 5. 자동 적용 (설정된 경우)
    let appliedChanges: string | undefined;
    if (this.config.autoApply && fix) {
      appliedChanges = await this.applyFix(failure.testFile, failure.failedLine, fix.correctedCode);
    }

    return {
      success: analysis.rootCause.confidence > 0.7 && !!fix,
      analysis: {
        rootCause: analysis.rootCause,
        affectedCode: {
          file: failure.testFile,
          line: failure.failedLine,
          original: failedLineCode.focusLine,
        },
        domChanges,
      },
      fix: fix ? {
        correctedCode: fix.correctedCode,
        explanation: fix.explanation,
        locatorStrategy: fix.locatorStrategy,
        alternatives: analysis.alternatives,
        prevention: analysis.prevention,
      } : undefined,
      appliedChanges,
    };
  }

  /**
   * 셀렉터만 복구
   */
  async healSelector(params: {
    originalSelector: string;
    currentDom: string;
    elementDescription?: string;
    context?: string;
  }): Promise<{
    found: boolean;
    candidates: {
      selector: string;
      playwrightCode: string;
      stability: 'high' | 'medium' | 'low';
      reason: string;
    }[];
    recommendation?: {
      index: number;
      explanation: string;
    };
  }> {
    const prompt = SELECTOR_HEAL_PROMPT
      .replace('{{originalSelector}}', params.originalSelector)
      .replace('{{currentDom}}', params.currentDom.slice(0, 10000))
      .replace('{{elementDescription}}', params.elementDescription || 'Unknown element')
      .replace('{{context}}', params.context || 'No additional context');

    const response = await this.aiClient.complete(prompt, {
      system: SELF_HEAL_SYSTEM_PROMPT,
      maxTokens: 2048,
    });

    // JSON 파싱
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // 파싱 실패
      }
    }

    // DOM에서 직접 대체 셀렉터 찾기 시도
    const parser = new DOMParser(params.currentDom);
    const elements = parser.getInteractiveElements();

    // 원본 셀렉터와 유사한 요소 찾기 (휴리스틱)
    const candidates = elements
      .filter((e) => {
        const locators = e.element.suggestedLocators;
        return locators.some((l) => l.confidence > 0.7);
      })
      .slice(0, 5)
      .map((e) => {
        const bestLocator = e.element.suggestedLocators[0];
        const stability: 'high' | 'medium' | 'low' = bestLocator.confidence > 0.9 ? 'high' : bestLocator.confidence > 0.7 ? 'medium' : 'low';
        return {
          selector: bestLocator.value,
          playwrightCode: bestLocator.playwright,
          stability,
          reason: `Found via ${bestLocator.strategy}`,
        };
      });

    return {
      found: candidates.length > 0,
      candidates,
      recommendation: candidates.length > 0 ? { index: 0, explanation: 'Best available match' } : undefined,
    };
  }

  /**
   * 여러 실패 일괄 처리
   */
  async healBatch(failures: TestFailure[]): Promise<Map<string, HealResult>> {
    const results = new Map<string, HealResult>();

    for (const failure of failures) {
      const key = `${failure.testFile}:${failure.testName}`;
      try {
        const result = await this.heal(failure);
        results.set(key, result);
      } catch (error) {
        results.set(key, {
          success: false,
          analysis: {
            rootCause: {
              type: 'unknown',
              description: `Healing failed: ${error instanceof Error ? error.message : String(error)}`,
              confidence: 0,
            },
            affectedCode: {
              file: failure.testFile,
              line: failure.failedLine,
              original: '',
            },
          },
        });
      }
    }

    return results;
  }

  /**
   * 복구 보고서 생성
   */
  generateReport(results: Map<string, HealResult>): string {
    const successful = [...results.values()].filter((r) => r.success);
    const failed = [...results.values()].filter((r) => !r.success);

    let report = `# Self-Healing Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `## Summary\n`;
    report += `- Total failures analyzed: ${results.size}\n`;
    report += `- Successfully healed: ${successful.length}\n`;
    report += `- Unable to heal: ${failed.length}\n\n`;

    if (successful.length > 0) {
      report += `## Healed Tests\n\n`;
      for (const [key, result] of results) {
        if (!result.success) continue;

        report += `### ${key}\n`;
        report += `- **Root Cause**: ${result.analysis.rootCause.type} (${Math.round(result.analysis.rootCause.confidence * 100)}% confidence)\n`;
        report += `- **Description**: ${result.analysis.rootCause.description}\n`;

        if (result.fix) {
          report += `- **Fix Applied**: ${result.fix.locatorStrategy}\n`;
          report += `\`\`\`typescript\n${result.fix.correctedCode}\n\`\`\`\n`;
        }
        report += '\n';
      }
    }

    if (failed.length > 0) {
      report += `## Unhealed Tests\n\n`;
      for (const [key, result] of results) {
        if (result.success) continue;

        report += `### ${key}\n`;
        report += `- **Analysis**: ${result.analysis.rootCause.description}\n\n`;
      }
    }

    return report;
  }

  private async analyzeFailure(params: {
    failure: TestFailure;
    testCode: { before: string[]; focusLine: string; after: string[] };
    currentDom: string;
    previousDom: string;
  }): Promise<z.infer<typeof AnalysisResponseSchema>> {
    const prompt = SELF_HEAL_ANALYSIS_PROMPT
      .replace('{{testFile}}', params.failure.testFile)
      .replace('{{testName}}', params.failure.testName)
      .replace('{{failedLine}}', String(params.failure.failedLine))
      .replace('{{errorMessage}}', params.failure.errorMessage)
      .replace('{{originalCode}}', [
        ...params.testCode.before,
        `>>> ${params.testCode.focusLine} <<<`,
        ...params.testCode.after,
      ].join('\n'))
      .replace('{{currentDom}}', params.currentDom.slice(0, 8000) || 'Not available')
      .replace('{{previousDom}}', params.previousDom.slice(0, 8000) || 'Not available');

    const response = await this.aiClient.complete(prompt, {
      system: SELF_HEAL_SYSTEM_PROMPT,
      maxTokens: 2048,
    });

    // JSON 파싱 시도
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return AnalysisResponseSchema.parse(parsed);
      } catch {
        // 파싱 실패 시 기본값
      }
    }

    // 기본 응답
    return {
      rootCause: {
        type: 'unknown',
        description: 'Unable to determine root cause automatically',
        confidence: 0.3,
      },
      fix: {
        correctedCode: params.testCode.focusLine,
        explanation: 'No automatic fix available',
        locatorStrategy: 'manual',
      },
    };
  }

  private async readTestFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      throw new Error(`Cannot read test file: ${filePath}`);
    }
  }

  private extractLineContext(
    code: string,
    lineNumber: number,
    contextLines: number = 5
  ): { before: string[]; focusLine: string; after: string[] } {
    const lines = code.split('\n');
    const zeroBasedLine = lineNumber - 1;

    return {
      before: lines.slice(Math.max(0, zeroBasedLine - contextLines), zeroBasedLine),
      focusLine: lines[zeroBasedLine] || '',
      after: lines.slice(zeroBasedLine + 1, zeroBasedLine + 1 + contextLines),
    };
  }

  private async applyFix(filePath: string, lineNumber: number, newCode: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const oldLine = lines[lineNumber - 1];
    lines[lineNumber - 1] = newCode;

    const newContent = lines.join('\n');
    await fs.writeFile(filePath, newContent);

    return `Replaced line ${lineNumber}:\n- ${oldLine}\n+ ${newCode}`;
  }
}
