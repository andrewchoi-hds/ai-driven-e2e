import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { getAIClient, type AIClient } from '../../core/ai-client.js';
import { type AgentHandler } from '../coordinator/index.js';

export interface DocAgentConfig {
  outputDir?: string;
  verbose?: boolean;
}

export type DocTask =
  | 'spec_to_doc'
  | 'generate_daily_digest'
  | 'update_coverage_report'
  | 'generate_api_doc';

export interface TestSpec {
  file: string;
  name: string;
  description?: string;
  steps: string[];
  assertions: string[];
}

export interface GherkinFeature {
  name: string;
  description: string;
  scenarios: {
    name: string;
    given: string[];
    when: string[];
    then: string[];
    sourceFile: string;
    sourceLine?: number;
  }[];
}

export interface DailyDigest {
  date: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    newTests: number;
    modifiedTests: number;
  };
  highlights: string[];
  failures: { test: string; reason: string }[];
  coverageChange: string;
}

export class DocumentationAgent {
  private aiClient: AIClient;
  private outputDir: string;
  private verbose: boolean;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(config: DocAgentConfig = {}) {
    this.aiClient = getAIClient();
    this.outputDir = config.outputDir || './reports/docs';
    this.verbose = config.verbose ?? false;

    this.initTemplates();
  }

  /**
   * 테스트 스펙을 Gherkin 문서로 변환
   */
  async specToDoc(specs: TestSpec[]): Promise<GherkinFeature[]> {
    this.log('Converting specs to Gherkin documentation');

    const features: GherkinFeature[] = [];

    // 파일별로 그룹화
    const byFile = new Map<string, TestSpec[]>();
    for (const spec of specs) {
      const existing = byFile.get(spec.file) || [];
      existing.push(spec);
      byFile.set(spec.file, existing);
    }

    for (const [file, fileSpecs] of byFile) {
      const feature = await this.convertToGherkin(file, fileSpecs);
      features.push(feature);
    }

    return features;
  }

  /**
   * 일일 테스트 리포트 생성
   */
  async generateDailyDigest(params: {
    testResults: { name: string; status: 'passed' | 'failed' | 'skipped'; error?: string }[];
    previousResults?: typeof params.testResults;
    gitChanges?: { added: string[]; modified: string[]; deleted: string[] };
  }): Promise<DailyDigest> {
    this.log('Generating daily digest');

    const { testResults, previousResults, gitChanges } = params;

    const passed = testResults.filter((t) => t.status === 'passed').length;
    const failed = testResults.filter((t) => t.status === 'failed').length;
    const skipped = testResults.filter((t) => t.status === 'skipped').length;

    // 새로운/수정된 테스트 계산
    const previousNames = new Set(previousResults?.map((t) => t.name) || []);
    const newTests = testResults.filter((t) => !previousNames.has(t.name)).length;
    const modifiedTests = gitChanges?.modified.filter((f) => f.endsWith('.spec.ts')).length || 0;

    // AI로 하이라이트 생성
    const highlights = await this.generateHighlights(testResults, gitChanges);

    const digest: DailyDigest = {
      date: new Date().toISOString().split('T')[0],
      summary: {
        totalTests: testResults.length,
        passed,
        failed,
        skipped,
        newTests,
        modifiedTests,
      },
      highlights,
      failures: testResults
        .filter((t) => t.status === 'failed')
        .map((t) => ({ test: t.name, reason: t.error || 'Unknown' })),
      coverageChange: this.calculateCoverageChange(testResults, previousResults),
    };

    // 파일로 저장
    await this.saveDigest(digest);

    return digest;
  }

  /**
   * Gherkin 문서를 파일로 저장
   */
  async saveFeatures(features: GherkinFeature[]): Promise<string[]> {
    const savedPaths: string[] = [];

    for (const feature of features) {
      const fileName = this.toKebabCase(feature.name) + '.feature';
      const filePath = path.join(this.outputDir, 'features', fileName);

      await fs.mkdir(path.dirname(filePath), { recursive: true });

      const content = this.renderGherkin(feature);
      await fs.writeFile(filePath, content);

      savedPaths.push(filePath);
      this.log(`Saved feature: ${filePath}`);
    }

    return savedPaths;
  }

  /**
   * Agent Coordinator용 핸들러
   */
  toHandler(): AgentHandler {
    return {
      type: 'documentation',
      execute: async (task: string, params: Record<string, unknown>) => {
        switch (task) {
          case 'spec_to_doc':
            return this.specToDoc(params.specs as TestSpec[]);
          case 'generate_daily_digest':
            return this.generateDailyDigest(params as Parameters<typeof this.generateDailyDigest>[0]);
          default:
            throw new Error(`Unknown documentation task: ${task}`);
        }
      },
    };
  }

  private async convertToGherkin(file: string, specs: TestSpec[]): Promise<GherkinFeature> {
    const featureName = this.extractFeatureName(file);

    const prompt = `Convert these test specifications to Gherkin format.

## Test File: ${file}

## Tests:
${specs.map((s) => `
### ${s.name}
${s.description || ''}
Steps: ${s.steps.join(', ')}
Assertions: ${s.assertions.join(', ')}
`).join('\n')}

## Output Format
Return a JSON object with this structure:
{
  "scenarios": [
    {
      "name": "Scenario name",
      "given": ["Given step 1", "And step 2"],
      "when": ["When action"],
      "then": ["Then expected result"]
    }
  ],
  "description": "Feature description"
}`;

    const response = await this.aiClient.complete(prompt, {
      system: 'You are a BDD expert. Convert technical tests to human-readable Gherkin scenarios.',
      maxTokens: 2048,
    });

    // JSON 파싱
    let scenarios: GherkinFeature['scenarios'] = [];
    let description = '';

    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        scenarios = parsed.scenarios.map((s: { name: string; given: string[]; when: string[]; then: string[] }) => ({
          ...s,
          sourceFile: file,
        }));
        description = parsed.description || '';
      } catch {
        // 파싱 실패 시 기본 변환
        scenarios = specs.map((s) => ({
          name: s.name,
          given: ['Given the user is on the page'],
          when: s.steps.map((step) => `When ${step}`),
          then: s.assertions.map((a) => `Then ${a}`),
          sourceFile: file,
        }));
      }
    }

    return {
      name: featureName,
      description,
      scenarios,
    };
  }

  private async generateHighlights(
    results: { name: string; status: string; error?: string }[],
    changes?: { added: string[]; modified: string[]; deleted: string[] }
  ): Promise<string[]> {
    const highlights: string[] = [];

    const passed = results.filter((r) => r.status === 'passed').length;
    const total = results.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    highlights.push(`Pass rate: ${passRate}% (${passed}/${total})`);

    if (changes?.added.length) {
      highlights.push(`New test files: ${changes.added.length}`);
    }

    if (changes?.modified.length) {
      highlights.push(`Modified files: ${changes.modified.length}`);
    }

    const failed = results.filter((r) => r.status === 'failed');
    if (failed.length > 0) {
      highlights.push(`⚠️ ${failed.length} test(s) need attention`);
    }

    return highlights;
  }

  private calculateCoverageChange(
    current: { status: string }[],
    previous?: { status: string }[]
  ): string {
    if (!previous) return 'N/A (first run)';

    const currentPass = current.filter((t) => t.status === 'passed').length / current.length;
    const prevPass = previous.filter((t) => t.status === 'passed').length / previous.length;

    const diff = (currentPass - prevPass) * 100;
    const sign = diff >= 0 ? '+' : '';

    return `${sign}${diff.toFixed(1)}%`;
  }

  private async saveDigest(digest: DailyDigest): Promise<void> {
    const template = this.templates.get('daily-digest');
    const content = template ? template(digest) : JSON.stringify(digest, null, 2);

    const filePath = path.join(this.outputDir, 'daily', `${digest.date}.md`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);

    this.log(`Saved daily digest: ${filePath}`);
  }

  private renderGherkin(feature: GherkinFeature): string {
    const lines: string[] = [
      `Feature: ${feature.name}`,
      feature.description ? `  ${feature.description}` : '',
      '',
    ];

    for (const scenario of feature.scenarios) {
      lines.push(`  Scenario: ${scenario.name}`);

      for (const step of scenario.given) {
        lines.push(`    ${step}`);
      }
      for (const step of scenario.when) {
        lines.push(`    ${step}`);
      }
      for (const step of scenario.then) {
        lines.push(`    ${step}`);
      }

      lines.push('');
      lines.push(`  # Source: ${scenario.sourceFile}${scenario.sourceLine ? `:${scenario.sourceLine}` : ''}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private initTemplates(): void {
    // Daily digest markdown template
    const digestTemplate = `# Daily Test Report - {{date}}

## Summary
- **Total Tests**: {{summary.totalTests}}
- **Passed**: {{summary.passed}} ✅
- **Failed**: {{summary.failed}} ❌
- **Skipped**: {{summary.skipped}} ⏭️
- **New Tests**: {{summary.newTests}}
- **Modified**: {{summary.modifiedTests}}
- **Coverage Change**: {{coverageChange}}

## Highlights
{{#each highlights}}
- {{this}}
{{/each}}

{{#if failures.length}}
## Failed Tests
| Test | Reason |
|------|--------|
{{#each failures}}
| {{test}} | {{reason}} |
{{/each}}
{{/if}}

---
*Generated by AI-Driven E2E Documentation Agent*
`;

    this.templates.set('daily-digest', Handlebars.compile(digestTemplate));
  }

  private extractFeatureName(file: string): string {
    const basename = path.basename(file, '.spec.ts');
    return basename
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[Documentation Agent] ${message}`);
    }
  }
}

export function createDocumentationAgent(config?: DocAgentConfig): DocumentationAgent {
  return new DocumentationAgent(config);
}
