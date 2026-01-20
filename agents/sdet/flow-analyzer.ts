import { z } from 'zod';
import { getAIClient, type AIClient } from '../../core/ai-client.js';
import { DOMParser } from '../../core/dom-parser.js';
import { FLOW_ANALYZER_SYSTEM_PROMPT, FLOW_ANALYSIS_PROMPT, TEST_GENERATION_PROMPT } from './prompts/flow.prompt.js';

export interface FlowAnalyzerConfig {
  aiClient?: AIClient;
  testStyle?: 'bdd' | 'tdd' | 'playwright';
}

export interface TestScenario {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'happy_path' | 'edge_case' | 'error' | 'boundary';
  description: string;
  preconditions: string[];
  steps: {
    action: string;
    locator?: string;
    expected: string;
  }[];
  assertions: string[];
}

export interface FlowAnalysisResult {
  analysis: {
    pageType: string;
    mainFeatures: string[];
    userJourneys: {
      name: string;
      steps: string[];
      endpoints: string[];
    }[];
  };
  testScenarios: TestScenario[];
  coverage: {
    features: Record<string, string[]>;
    gaps: string[];
  };
}

export interface GeneratedTest {
  fileName: string;
  code: string;
  scenarios: string[];
}

const FlowAnalysisSchema = z.object({
  analysis: z.object({
    pageType: z.string(),
    mainFeatures: z.array(z.string()),
    userJourneys: z.array(z.object({
      name: z.string(),
      steps: z.array(z.string()),
      endpoints: z.array(z.string()),
    })),
  }),
  testScenarios: z.array(z.object({
    name: z.string(),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    type: z.enum(['happy_path', 'edge_case', 'error', 'boundary']),
    description: z.string(),
    preconditions: z.array(z.string()),
    steps: z.array(z.object({
      action: z.string(),
      locator: z.string().optional(),
      expected: z.string(),
    })),
    assertions: z.array(z.string()),
  })),
  coverage: z.object({
    features: z.record(z.array(z.string())),
    gaps: z.array(z.string()),
  }),
});

export class FlowAnalyzer {
  private aiClient: AIClient;
  private config: Required<FlowAnalyzerConfig>;

  constructor(config: FlowAnalyzerConfig = {}) {
    this.aiClient = config.aiClient || getAIClient();
    this.config = {
      aiClient: this.aiClient,
      testStyle: config.testStyle || 'playwright',
    };
  }

  /**
   * 페이지 분석 및 테스트 시나리오 생성
   */
  async analyzeFlow(params: {
    url: string;
    html: string;
    requirement: string;
    existingTests?: string[];
  }): Promise<FlowAnalysisResult> {
    const { url, html, requirement, existingTests } = params;

    // DOM 분석으로 기본 정보 추출
    const parser = new DOMParser(html);
    const elements = parser.getInteractiveElements();
    const sections = parser.getPageSections();
    const forms = parser.getFormFields();

    // AI 분석 요청
    const prompt = FLOW_ANALYSIS_PROMPT
      .replace('{{requirement}}', requirement)
      .replace('{{url}}', url)
      .replace('{{html}}', html.slice(0, 12000))
      .replace('{{existingTests}}', existingTests?.join('\n\n') || 'None');

    const enrichedPrompt = `${prompt}

## DOM Analysis Summary
- Interactive elements: ${elements.length}
- Page sections: ${sections.map((s) => s.name).join(', ')}
- Forms: ${forms.length}
- Form fields: ${forms.flatMap((f) => f.fields).map((f) => f.name).join(', ')}

## Element Types
${this.summarizeElements(elements)}`;

    const response = await this.aiClient.complete(enrichedPrompt, {
      system: FLOW_ANALYZER_SYSTEM_PROMPT,
      maxTokens: 4096,
    });

    // JSON 파싱
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return FlowAnalysisSchema.parse(parsed);
      } catch {
        // 파싱 실패 시 기본값 생성
      }
    }

    // 기본 분석 결과 생성
    return this.generateDefaultAnalysis(url, elements, forms, requirement);
  }

  /**
   * 분석 결과에서 테스트 코드 생성
   */
  async generateTests(params: {
    analysis: FlowAnalysisResult;
    pageObjectCode: string;
    pageClassName: string;
  }): Promise<GeneratedTest[]> {
    const { analysis, pageObjectCode, pageClassName } = params;
    const tests: GeneratedTest[] = [];

    // 시나리오를 우선순위별로 그룹화
    const byPriority = new Map<string, TestScenario[]>();
    for (const scenario of analysis.testScenarios) {
      const existing = byPriority.get(scenario.priority) || [];
      existing.push(scenario);
      byPriority.set(scenario.priority, existing);
    }

    // 각 그룹별 테스트 파일 생성
    for (const [priority, scenarios] of byPriority) {
      const testCode = await this.generateTestCode({
        scenarios,
        pageObjectCode,
        pageClassName,
        suiteName: `${pageClassName} - ${priority} priority tests`,
      });

      tests.push({
        fileName: `${this.toKebabCase(pageClassName)}.${priority}.spec.ts`,
        code: testCode,
        scenarios: scenarios.map((s) => s.name),
      });
    }

    return tests;
  }

  /**
   * 단일 시나리오에서 테스트 코드 생성
   */
  async generateTestCode(params: {
    scenarios: TestScenario[];
    pageObjectCode: string;
    pageClassName: string;
    suiteName: string;
  }): Promise<string> {
    const { scenarios, pageObjectCode, pageClassName, suiteName } = params;

    const scenarioDescriptions = scenarios.map((s) => `
### ${s.name}
- Type: ${s.type}
- Priority: ${s.priority}
- Description: ${s.description}
- Preconditions: ${s.preconditions.join(', ')}
- Steps:
${s.steps.map((step, i) => `  ${i + 1}. ${step.action} → ${step.expected}`).join('\n')}
- Assertions: ${s.assertions.join(', ')}
`).join('\n');

    const prompt = TEST_GENERATION_PROMPT
      .replace('{{scenario}}', scenarioDescriptions)
      .replace('{{pageObject}}', pageObjectCode.slice(0, 3000))
      .replace('{{testStyle}}', this.config.testStyle)
      .replace('{{PageClass}}', pageClassName)
      .replace('{{PageFile}}', this.toKebabCase(pageClassName))
      .replace('{{suiteName}}', suiteName);

    const response = await this.aiClient.complete(prompt, {
      system: FLOW_ANALYZER_SYSTEM_PROMPT,
      maxTokens: 4096,
    });

    // 코드 추출
    const codeMatch = response.match(/```typescript\n?([\s\S]*?)\n?```/);
    if (codeMatch) {
      return codeMatch[1];
    }

    // 기본 테스트 템플릿 생성
    return this.generateDefaultTestCode(scenarios, pageClassName);
  }

  /**
   * 사용자 요구사항에서 테스트 흐름 추출
   */
  async extractFlowsFromRequirement(requirement: string): Promise<{
    flows: { name: string; description: string; steps: string[] }[];
    suggestions: string[];
  }> {
    const prompt = `Extract testable user flows from this requirement:

## Requirement
${requirement}

## Tasks
1. Identify distinct user journeys/flows
2. Break each flow into testable steps
3. Suggest additional flows that should be tested

## Output Format
\`\`\`json
{
  "flows": [
    {
      "name": "Flow name",
      "description": "What this flow tests",
      "steps": ["Step 1", "Step 2", "..."]
    }
  ],
  "suggestions": ["Additional test suggestions"]
}
\`\`\``;

    const response = await this.aiClient.complete(prompt, {
      system: FLOW_ANALYZER_SYSTEM_PROMPT,
      maxTokens: 2048,
    });

    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // 파싱 실패
      }
    }

    return {
      flows: [{
        name: 'Main Flow',
        description: requirement,
        steps: ['Navigate to page', 'Perform action', 'Verify result'],
      }],
      suggestions: [],
    };
  }

  private summarizeElements(elements: ReturnType<DOMParser['getInteractiveElements']>): string {
    const byType = new Map<string, number>();
    for (const el of elements) {
      byType.set(el.type, (byType.get(el.type) || 0) + 1);
    }

    return [...byType.entries()]
      .map(([type, count]) => `- ${type}: ${count}`)
      .join('\n');
  }

  private generateDefaultAnalysis(
    url: string,
    elements: ReturnType<DOMParser['getInteractiveElements']>,
    forms: ReturnType<DOMParser['getFormFields']>,
    requirement: string
  ): FlowAnalysisResult {
    const hasLogin = elements.some((e) =>
      e.element.text.toLowerCase().includes('login') ||
      e.element.text.toLowerCase().includes('sign in')
    );

    const hasForm = forms.length > 0;

    const scenarios: TestScenario[] = [];

    // 기본 시나리오 생성
    if (hasForm) {
      scenarios.push({
        name: 'Submit form with valid data',
        priority: 'critical',
        type: 'happy_path',
        description: 'Verify form submission with valid input',
        preconditions: ['User is on the page'],
        steps: forms[0].fields.map((f) => ({
          action: `Fill ${f.name} field`,
          locator: f.locator,
          expected: 'Field accepts input',
        })),
        assertions: ['Form submits successfully', 'Success message displayed'],
      });

      scenarios.push({
        name: 'Submit form with empty required fields',
        priority: 'high',
        type: 'error',
        description: 'Verify validation for required fields',
        preconditions: ['User is on the page'],
        steps: [{ action: 'Click submit without filling', expected: 'Validation error shown' }],
        assertions: ['Error messages displayed for required fields'],
      });
    }

    if (hasLogin) {
      scenarios.push({
        name: 'Login with valid credentials',
        priority: 'critical',
        type: 'happy_path',
        description: 'Verify successful login flow',
        preconditions: ['User has valid account'],
        steps: [
          { action: 'Enter username', expected: 'Username accepted' },
          { action: 'Enter password', expected: 'Password accepted' },
          { action: 'Click login button', expected: 'User is logged in' },
        ],
        assertions: ['Dashboard is displayed', 'User name shown in header'],
      });
    }

    return {
      analysis: {
        pageType: hasLogin ? 'login' : hasForm ? 'form' : 'general',
        mainFeatures: [
          ...elements.slice(0, 5).map((e) => e.element.text.slice(0, 30)),
        ].filter(Boolean),
        userJourneys: [{
          name: 'Primary Flow',
          steps: ['Load page', 'Interact with main elements', 'Complete action'],
          endpoints: [url],
        }],
      },
      testScenarios: scenarios,
      coverage: {
        features: {
          'core': scenarios.map((s) => s.name),
        },
        gaps: [
          'Edge cases not fully covered',
          'Error handling scenarios may need expansion',
        ],
      },
    };
  }

  private generateDefaultTestCode(scenarios: TestScenario[], pageClassName: string): string {
    const pageFile = this.toKebabCase(pageClassName);

    const testCases = scenarios.map((s) => `
  test('${s.name}', async ({ page }) => {
    const ${pageClassName.toLowerCase()} = new ${pageClassName}(page);
    await ${pageClassName.toLowerCase()}.goto();

    // TODO: Implement test steps
    ${s.steps.map((step) => `// ${step.action}`).join('\n    ')}

    // Assertions
    ${s.assertions.map((a) => `// expect: ${a}`).join('\n    ')}
  });`).join('\n');

    return `import { test, expect } from '@playwright/test';
import { ${pageClassName} } from '../pages/${pageFile}';

test.describe('${pageClassName} Tests', () => {
${testCases}
});`;
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}
