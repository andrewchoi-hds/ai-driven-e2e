import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

export interface ElementInfo {
  tag: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string>;
  text: string;
  children: ElementInfo[];
  xpath: string;
  cssPath: string;
  suggestedLocators: SuggestedLocator[];
}

export interface SuggestedLocator {
  strategy: 'testId' | 'ariaLabel' | 'role' | 'text' | 'css' | 'xpath';
  value: string;
  confidence: number; // 0-1, 안정성 점수
  playwright: string; // Playwright locator 코드
}

export interface InteractiveElement {
  element: ElementInfo;
  type: 'button' | 'link' | 'input' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'form' | 'other';
  purpose?: string; // AI가 추론한 목적
}

export class DOMParser {
  private $: CheerioAPI;
  private html: string;

  constructor(html: string) {
    this.html = html;
    this.$ = cheerio.load(html);
  }

  /**
   * 모든 상호작용 가능한 요소 추출
   */
  getInteractiveElements(): InteractiveElement[] {
    const elements: InteractiveElement[] = [];
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[onclick]',
      '[tabindex]',
    ];

    this.$(interactiveSelectors.join(', ')).each((_, el) => {
      const element = el as Element;
      const info = this.getElementInfo(element);
      const type = this.determineElementType(element);

      elements.push({
        element: info,
        type,
      });
    });

    return elements;
  }

  /**
   * 특정 요소의 상세 정보 추출
   */
  getElementInfo(element: Element): ElementInfo {
    const $el = this.$(element);
    const tag = element.tagName?.toLowerCase() || '';

    const attributes: Record<string, string> = {};
    if (element.attribs) {
      for (const [key, value] of Object.entries(element.attribs)) {
        attributes[key] = String(value);
      }
    }

    const suggestedLocators = this.generateLocators(element);

    return {
      tag,
      id: attributes.id,
      classes: (attributes.class || '').split(/\s+/).filter(Boolean),
      attributes,
      text: $el.text().trim().slice(0, 100), // 텍스트 100자 제한
      children: [], // 필요시 재귀적으로 채움
      xpath: this.getXPath(element),
      cssPath: this.getCssPath(element),
      suggestedLocators,
    };
  }

  /**
   * Locator 전략 생성
   */
  private generateLocators(element: Element): SuggestedLocator[] {
    const locators: SuggestedLocator[] = [];
    const $el = this.$(element);
    const attrs = element.attribs || {};

    // 1. data-testid (최우선)
    if (attrs['data-testid']) {
      locators.push({
        strategy: 'testId',
        value: attrs['data-testid'],
        confidence: 0.95,
        playwright: `page.getByTestId('${attrs['data-testid']}')`,
      });
    }

    // 2. aria-label
    if (attrs['aria-label']) {
      locators.push({
        strategy: 'ariaLabel',
        value: attrs['aria-label'],
        confidence: 0.9,
        playwright: `page.getByLabel('${attrs['aria-label']}')`,
      });
    }

    // 3. role + name
    if (attrs.role) {
      const name = attrs['aria-label'] || $el.text().trim().slice(0, 50);
      if (name) {
        locators.push({
          strategy: 'role',
          value: `${attrs.role}[name="${name}"]`,
          confidence: 0.85,
          playwright: `page.getByRole('${attrs.role}', { name: '${name}' })`,
        });
      }
    }

    // 4. Text content (버튼, 링크 등)
    const text = $el.text().trim();
    if (text && text.length < 50) {
      const tag = element.tagName?.toLowerCase();
      if (tag === 'button' || attrs.role === 'button') {
        locators.push({
          strategy: 'text',
          value: text,
          confidence: 0.8,
          playwright: `page.getByRole('button', { name: '${text}' })`,
        });
      } else if (tag === 'a') {
        locators.push({
          strategy: 'text',
          value: text,
          confidence: 0.8,
          playwright: `page.getByRole('link', { name: '${text}' })`,
        });
      }
    }

    // 5. ID (안정성 낮음 - 동적 ID 가능성)
    if (attrs.id && !this.isLikelyDynamicId(attrs.id)) {
      locators.push({
        strategy: 'css',
        value: `#${attrs.id}`,
        confidence: 0.7,
        playwright: `page.locator('#${attrs.id}')`,
      });
    }

    // 6. CSS Path (최후의 수단)
    const cssPath = this.getCssPath(element);
    locators.push({
      strategy: 'css',
      value: cssPath,
      confidence: 0.5,
      playwright: `page.locator('${cssPath}')`,
    });

    // 신뢰도 순으로 정렬
    return locators.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 동적으로 생성된 ID인지 판단
   */
  private isLikelyDynamicId(id: string): boolean {
    // UUID 패턴
    if (/^[a-f0-9-]{36}$/i.test(id)) return true;
    // 숫자로 끝나는 패턴 (예: input-12345)
    if (/\d{4,}$/.test(id)) return true;
    // React/Vue 등 프레임워크 생성 ID
    if (/^:r[a-z0-9]+:$/.test(id)) return true;
    return false;
  }

  /**
   * XPath 생성
   */
  private getXPath(element: Element): string {
    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current.type === 'tag') {
      const tag = current.tagName?.toLowerCase();
      if (!tag) break;

      const parent = current.parent as Element | null;
      if (parent && parent.type === 'tag') {
        const siblings = this.$(parent).children(tag).toArray();
        const index = siblings.indexOf(current) + 1;
        parts.unshift(siblings.length > 1 ? `${tag}[${index}]` : tag);
      } else {
        parts.unshift(tag);
      }

      current = parent;
    }

    return '/' + parts.join('/');
  }

  /**
   * CSS 선택자 경로 생성
   */
  private getCssPath(element: Element): string {
    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current.type === 'tag') {
      const tag = current.tagName?.toLowerCase();
      if (!tag || tag === 'html' || tag === 'body') break;

      let selector = tag;
      const attrs = current.attribs || {};

      if (attrs.id && !this.isLikelyDynamicId(attrs.id)) {
        selector = `#${attrs.id}`;
        parts.unshift(selector);
        break; // ID가 있으면 거기서 멈춤
      }

      if (attrs.class) {
        const classes = attrs.class
          .split(/\s+/)
          .filter((c: string) => c && !this.isLikelyDynamicClass(c))
          .slice(0, 2)
          .join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }

      // 형제 요소 중 같은 선택자가 있으면 :nth-child 추가
      const parent = current.parent as Element | null;
      if (parent && parent.type === 'tag') {
        const siblings = this.$(parent).children().toArray();
        const sameTagSiblings = siblings.filter(
          (s) => (s as Element).tagName?.toLowerCase() === tag
        );
        if (sameTagSiblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }

      parts.unshift(selector);
      current = parent;
    }

    return parts.join(' > ');
  }

  /**
   * 동적 클래스인지 판단
   */
  private isLikelyDynamicClass(className: string): boolean {
    // 해시가 포함된 클래스 (CSS Modules 등)
    if (/[_-][a-zA-Z0-9]{5,}$/.test(className)) return true;
    // Tailwind 등 유틸리티 클래스 중 동적인 것
    if (/^(css|styles?|sc)-/.test(className)) return true;
    return false;
  }

  /**
   * 요소 타입 결정
   */
  private determineElementType(
    element: Element
  ): InteractiveElement['type'] {
    const tag = element.tagName?.toLowerCase();
    const attrs = element.attribs || {};
    const type = attrs.type?.toLowerCase();

    if (tag === 'button' || attrs.role === 'button') return 'button';
    if (tag === 'a') return 'link';
    if (tag === 'select') return 'select';
    if (tag === 'textarea') return 'textarea';
    if (tag === 'form') return 'form';

    if (tag === 'input') {
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'submit' || type === 'button') return 'button';
      return 'input';
    }

    return 'other';
  }

  /**
   * 페이지의 주요 섹션/영역 식별
   */
  getPageSections(): { name: string; selector: string; elements: number }[] {
    const sections: { name: string; selector: string; elements: number }[] = [];

    const sectionSelectors = [
      { selector: 'header', name: 'Header' },
      { selector: 'nav', name: 'Navigation' },
      { selector: 'main', name: 'Main Content' },
      { selector: 'aside', name: 'Sidebar' },
      { selector: 'footer', name: 'Footer' },
      { selector: '[role="navigation"]', name: 'Navigation' },
      { selector: '[role="main"]', name: 'Main Content' },
      { selector: '[role="banner"]', name: 'Banner' },
      { selector: '[role="search"]', name: 'Search' },
      { selector: 'form', name: 'Form' },
    ];

    for (const { selector, name } of sectionSelectors) {
      const elements = this.$(selector);
      if (elements.length > 0) {
        sections.push({
          name,
          selector,
          elements: elements.find('*').length,
        });
      }
    }

    return sections;
  }

  /**
   * 폼 필드 추출
   */
  getFormFields(): {
    form: string;
    fields: {
      name: string;
      type: string;
      label?: string;
      required: boolean;
      locator: string;
    }[];
  }[] {
    const forms: ReturnType<typeof this.getFormFields> = [];

    this.$('form').each((formIndex, formEl) => {
      const $form = this.$(formEl);
      const fields: (typeof forms)[0]['fields'] = [];

      $form.find('input, select, textarea').each((_, fieldEl) => {
        const $field = this.$(fieldEl);
        const element = fieldEl as Element;
        const attrs = element.attribs || {};

        // 라벨 찾기
        let label: string | undefined;
        if (attrs.id) {
          const $label = this.$(`label[for="${attrs.id}"]`);
          if ($label.length) {
            label = $label.text().trim();
          }
        }
        if (!label) {
          const $parent = $field.closest('label');
          if ($parent.length) {
            label = $parent.text().trim();
          }
        }

        const locators = this.generateLocators(element);
        const bestLocator = locators[0];

        fields.push({
          name: attrs.name || attrs.id || `field-${fields.length}`,
          type: attrs.type || element.tagName?.toLowerCase() || 'text',
          label,
          required: attrs.required !== undefined,
          locator: bestLocator?.playwright || '',
        });
      });

      forms.push({
        form: `form:nth-of-type(${formIndex + 1})`,
        fields,
      });
    });

    return forms;
  }

  /**
   * 두 DOM의 차이점 분석
   */
  static compareDOMs(
    before: string,
    after: string
  ): {
    added: ElementInfo[];
    removed: ElementInfo[];
    modified: { before: ElementInfo; after: ElementInfo; changes: string[] }[];
  } {
    const parserBefore = new DOMParser(before);
    const parserAfter = new DOMParser(after);

    const elementsBefore = parserBefore.getInteractiveElements();
    const elementsAfter = parserAfter.getInteractiveElements();

    // 간단한 비교 로직 - 실제로는 더 정교한 매칭 필요
    const beforeMap = new Map(
      elementsBefore.map((e) => [e.element.cssPath, e.element])
    );
    const afterMap = new Map(
      elementsAfter.map((e) => [e.element.cssPath, e.element])
    );

    const added: ElementInfo[] = [];
    const removed: ElementInfo[] = [];
    const modified: { before: ElementInfo; after: ElementInfo; changes: string[] }[] = [];

    // 추가된 요소
    for (const [path, element] of afterMap) {
      if (!beforeMap.has(path)) {
        added.push(element);
      }
    }

    // 제거된 요소
    for (const [path, element] of beforeMap) {
      if (!afterMap.has(path)) {
        removed.push(element);
      }
    }

    // 수정된 요소 (같은 경로지만 속성이 다른 경우)
    for (const [path, beforeEl] of beforeMap) {
      const afterEl = afterMap.get(path);
      if (afterEl) {
        const changes: string[] = [];

        if (beforeEl.text !== afterEl.text) {
          changes.push(`text: "${beforeEl.text}" → "${afterEl.text}"`);
        }
        if (beforeEl.id !== afterEl.id) {
          changes.push(`id: "${beforeEl.id}" → "${afterEl.id}"`);
        }
        if (JSON.stringify(beforeEl.classes) !== JSON.stringify(afterEl.classes)) {
          changes.push(`classes changed`);
        }

        if (changes.length > 0) {
          modified.push({ before: beforeEl, after: afterEl, changes });
        }
      }
    }

    return { added, removed, modified };
  }
}
