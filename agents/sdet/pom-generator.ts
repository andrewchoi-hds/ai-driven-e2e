import { z } from 'zod';
import { getAIClient, type AIClient } from '../../core/ai-client.js';
import { DOMParser, type InteractiveElement } from '../../core/dom-parser.js';
import { POM_SYSTEM_PROMPT, POM_GENERATOR_PROMPT, LOCATOR_SUGGESTION_PROMPT } from './prompts/pom.prompt.js';

export interface POMGeneratorConfig {
  aiClient?: AIClient;
  locatorPriority?: string[];
  includeComments?: boolean;
  style?: 'class' | 'functional';
}

export interface GeneratedPOM {
  className: string;
  code: string;
  locators: LocatorInfo[];
  actions: ActionInfo[];
  metadata: {
    url: string;
    generatedAt: Date;
    elementCount: number;
  };
}

export interface LocatorInfo {
  name: string;
  selector: string;
  playwrightCode: string;
  elementType: string;
  confidence: number;
}

export interface ActionInfo {
  name: string;
  description: string;
  code: string;
  parameters?: { name: string; type: string }[];
}

const GeneratedPOMSchema = z.object({
  className: z.string(),
  locators: z.array(z.object({
    name: z.string(),
    selector: z.string(),
    playwrightCode: z.string(),
    elementType: z.string(),
    confidence: z.number(),
  })),
  actions: z.array(z.object({
    name: z.string(),
    description: z.string(),
    code: z.string(),
    parameters: z.array(z.object({
      name: z.string(),
      type: z.string(),
    })).optional(),
  })),
});

export class POMGenerator {
  private aiClient: AIClient;
  private config: Required<POMGeneratorConfig>;

  constructor(config: POMGeneratorConfig = {}) {
    this.aiClient = config.aiClient || getAIClient();
    this.config = {
      aiClient: this.aiClient,
      locatorPriority: config.locatorPriority || [
        'data-testid',
        'aria-label',
        'role',
        'text',
        'css',
      ],
      includeComments: config.includeComments ?? true,
      style: config.style || 'class',
    };
  }

  /**
   * HTML에서 Page Object Model 생성
   */
  async generate(params: {
    html: string;
    url: string;
    className?: string;
  }): Promise<GeneratedPOM> {
    const { html, url, className: providedClassName } = params;

    // DOM 분석
    const parser = new DOMParser(html);
    const elements = parser.getInteractiveElements();
    const sections = parser.getPageSections();
    const forms = parser.getFormFields();

    // 클래스명 생성
    const className = providedClassName || this.generateClassName(url);

    // 페이지 타이틀 추출
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';

    // AI를 사용해 POM 생성
    const prompt = this.buildPrompt(html, url, title, elements, sections, forms);

    const response = await this.aiClient.complete(prompt, {
      system: POM_SYSTEM_PROMPT,
      maxTokens: 4096,
    });

    // 응답에서 코드 추출
    const { code, locators, actions } = this.parseResponse(response, className, elements);

    return {
      className,
      code,
      locators,
      actions,
      metadata: {
        url,
        generatedAt: new Date(),
        elementCount: elements.length,
      },
    };
  }

  /**
   * 특정 요소에 대한 locator 제안
   */
  async suggestLocator(params: {
    elementHtml: string;
    contextHtml: string;
    purpose?: string;
  }): Promise<{
    primary: { code: string; reason: string };
    fallbacks: { code: string; reason: string }[];
    warnings: string[];
  }> {
    const prompt = LOCATOR_SUGGESTION_PROMPT
      .replace('{{elementHtml}}', params.elementHtml)
      .replace('{{contextHtml}}', params.contextHtml);

    const response = await this.aiClient.complete(prompt, {
      system: POM_SYSTEM_PROMPT,
      maxTokens: 1024,
    });

    // JSON 파싱
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // 파싱 실패 시 기본값 반환
      }
    }

    return {
      primary: { code: "page.locator('/* unable to generate */')", reason: 'Generation failed' },
      fallbacks: [],
      warnings: ['Failed to generate locator suggestions'],
    };
  }

  /**
   * 기존 POM 업데이트 (새로운 요소 추가)
   */
  async updatePOM(params: {
    existingCode: string;
    newHtml: string;
    url: string;
  }): Promise<{
    updatedCode: string;
    changes: { type: 'added' | 'modified' | 'removed'; name: string }[];
  }> {
    const { existingCode, newHtml, url } = params;

    const parser = new DOMParser(newHtml);
    const elements = parser.getInteractiveElements();

    const prompt = `Update this existing Page Object Model with any new or changed elements.

## Existing Code
\`\`\`typescript
${existingCode}
\`\`\`

## Current HTML
\`\`\`html
${newHtml.slice(0, 10000)}
\`\`\`

## Instructions
1. Identify new elements not in the existing POM
2. Identify elements that may have changed selectors
3. Add new locators and actions as needed
4. Preserve existing working code
5. Output the complete updated POM

Output the updated TypeScript code and list changes made.`;

    const response = await this.aiClient.complete(prompt, {
      system: POM_SYSTEM_PROMPT,
      maxTokens: 4096,
    });

    // 코드 추출
    const codeMatch = response.match(/```typescript\n?([\s\S]*?)\n?```/);
    const updatedCode = codeMatch ? codeMatch[1] : existingCode;

    // 변경사항 추출 (간단한 휴리스틱)
    const changes: { type: 'added' | 'modified' | 'removed'; name: string }[] = [];

    // 새로운 locator 찾기
    const newLocatorMatches = updatedCode.matchAll(/readonly\s+(\w+):/g);
    const existingLocatorMatches = existingCode.matchAll(/readonly\s+(\w+):/g);

    const existingLocators = new Set([...existingLocatorMatches].map((m) => m[1]));
    for (const match of newLocatorMatches) {
      if (!existingLocators.has(match[1])) {
        changes.push({ type: 'added', name: match[1] });
      }
    }

    return { updatedCode, changes };
  }

  private buildPrompt(
    html: string,
    url: string,
    title: string,
    elements: InteractiveElement[],
    sections: { name: string; selector: string; elements: number }[],
    forms: ReturnType<DOMParser['getFormFields']>
  ): string {
    // HTML 크기 제한 (토큰 절약)
    const truncatedHtml = html.length > 15000 ? html.slice(0, 15000) + '\n<!-- truncated -->' : html;

    const elementsSummary = elements.slice(0, 30).map((e) => ({
      type: e.type,
      text: e.element.text.slice(0, 50),
      bestLocator: e.element.suggestedLocators[0]?.playwright || 'N/A',
    }));

    return `${POM_GENERATOR_PROMPT
      .replace('{{url}}', url)
      .replace('{{title}}', title)
      .replace('{{html}}', truncatedHtml)
      .replace('{{className}}', this.generateClassName(url))}

## Additional Context

### Page Sections
${JSON.stringify(sections, null, 2)}

### Interactive Elements Summary (${elements.length} total)
${JSON.stringify(elementsSummary, null, 2)}

### Forms
${JSON.stringify(forms, null, 2)}

Generate the complete Page Object class.`;
  }

  private parseResponse(
    response: string,
    className: string,
    elements: InteractiveElement[]
  ): {
    code: string;
    locators: LocatorInfo[];
    actions: ActionInfo[];
  } {
    // 코드 블록 추출
    const codeMatch = response.match(/```typescript\n?([\s\S]*?)\n?```/);
    let code = codeMatch ? codeMatch[1] : '';

    // 코드가 없으면 기본 템플릿 생성
    if (!code) {
      code = this.generateDefaultPOM(className, elements);
    }

    // Locator 정보 추출
    const locators: LocatorInfo[] = [];
    const locatorMatches = code.matchAll(
      /(?:readonly\s+)?(\w+)(?::\s*Locator)?\s*=\s*this\.page\.(getBy\w+|locator)\(([^)]+)\)/g
    );

    for (const match of locatorMatches) {
      const [, name, method, args] = match;
      locators.push({
        name,
        selector: args,
        playwrightCode: `page.${method}(${args})`,
        elementType: this.inferElementType(name),
        confidence: method === 'getByTestId' ? 0.95 : method === 'getByRole' ? 0.85 : 0.7,
      });
    }

    // Action 정보 추출
    const actions: ActionInfo[] = [];
    const actionMatches = code.matchAll(
      /async\s+(\w+)\s*\(([^)]*)\)[^{]*\{([^}]+)\}/g
    );

    for (const match of actionMatches) {
      const [, name, params, body] = match;
      if (name !== 'constructor' && !name.startsWith('get')) {
        actions.push({
          name,
          description: this.inferActionDescription(name, body),
          code: body.trim(),
          parameters: params
            ? params.split(',').map((p) => {
                const [pName, pType] = p.trim().split(':').map((s) => s.trim());
                return { name: pName, type: pType || 'unknown' };
              })
            : undefined,
        });
      }
    }

    return { code, locators, actions };
  }

  private generateDefaultPOM(className: string, elements: InteractiveElement[]): string {
    const locatorLines: string[] = [];
    const initLines: string[] = [];

    for (const element of elements.slice(0, 20)) {
      const name = this.generateLocatorName(element);
      const locator = element.element.suggestedLocators[0];

      if (locator) {
        locatorLines.push(`  readonly ${name}: Locator;`);
        initLines.push(`    this.${name} = ${locator.playwright.replace('page', 'this.page')};`);
      }
    }

    return `import { Page, Locator, expect } from '@playwright/test';

export class ${className} {
  readonly page: Page;

${locatorLines.join('\n')}

  constructor(page: Page) {
    this.page = page;
${initLines.join('\n')}
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
  }
}`;
  }

  private generateClassName(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // 경로에서 클래스명 생성
      const parts = path.split('/').filter(Boolean);
      if (parts.length === 0) {
        return 'HomePage';
      }

      const name = parts
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join('');

      return `${name}Page`;
    } catch {
      return 'GeneratedPage';
    }
  }

  private generateLocatorName(element: InteractiveElement): string {
    const { type, element: info } = element;

    // data-testid에서 이름 추출
    if (info.attributes['data-testid']) {
      return this.toCamelCase(info.attributes['data-testid']);
    }

    // aria-label에서 이름 추출
    if (info.attributes['aria-label']) {
      return this.toCamelCase(info.attributes['aria-label']) + this.capitalizeType(type);
    }

    // 텍스트에서 이름 추출
    if (info.text) {
      return this.toCamelCase(info.text.slice(0, 20)) + this.capitalizeType(type);
    }

    // ID 사용
    if (info.id) {
      return this.toCamelCase(info.id);
    }

    return `${type}Element`;
  }

  private toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^./, (chr) => chr.toLowerCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  private capitalizeType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  private inferElementType(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('button') || lowerName.includes('btn')) return 'button';
    if (lowerName.includes('input') || lowerName.includes('field')) return 'input';
    if (lowerName.includes('link')) return 'link';
    if (lowerName.includes('checkbox')) return 'checkbox';
    if (lowerName.includes('select') || lowerName.includes('dropdown')) return 'select';
    return 'element';
  }

  private inferActionDescription(name: string, body: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('click')) return 'Clicks on an element';
    if (lowerName.includes('fill') || lowerName.includes('type')) return 'Fills in a form field';
    if (lowerName.includes('submit')) return 'Submits a form';
    if (lowerName.includes('navigate') || lowerName.includes('goto')) return 'Navigates to a page';
    if (lowerName.includes('wait')) return 'Waits for a condition';
    if (lowerName.includes('verify') || lowerName.includes('assert')) return 'Verifies an expectation';
    return `Performs ${name} action`;
  }
}
