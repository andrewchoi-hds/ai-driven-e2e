export const POM_SYSTEM_PROMPT = `You are an expert in creating Page Object Models for Playwright E2E tests.
Your task is to analyze HTML and generate clean, maintainable TypeScript Page Object classes.

## Principles
1. Use semantic locators (getByRole, getByLabel, getByTestId) over CSS/XPath when possible
2. Prioritize stability: data-testid > aria-label > role > text > css
3. Create reusable action methods that represent user interactions
4. Include proper TypeScript types and JSDoc comments
5. Follow the Page Object pattern best practices

## Locator Priority
1. data-testid: Most stable, explicitly set for testing
2. aria-label/aria-labelledby: Accessible and semantic
3. role + name: Semantic and readable
4. Text content: Human-readable but may change
5. CSS selectors: Last resort, avoid when possible

## Output Format
Generate TypeScript code that:
- Extends a BasePage class if provided
- Uses Playwright's Locator API
- Groups related locators logically
- Provides action methods for common interactions
- Includes assertions methods when appropriate`;

export const POM_GENERATOR_PROMPT = `Analyze the following HTML and generate a Playwright Page Object Model class.

## Page Information
- URL: {{url}}
- Page Title: {{title}}

## HTML Content
\`\`\`html
{{html}}
\`\`\`

## Requirements
1. Identify all interactive elements (buttons, links, inputs, forms)
2. Create appropriate locators for each element
3. Group locators by page section/feature
4. Create action methods for user interactions
5. Add helper methods for common assertions

## Output
Generate a TypeScript Page Object class following this structure:

\`\`\`typescript
import { Page, Locator, expect } from '@playwright/test';

export class {{className}} {
  readonly page: Page;

  // Locators
  // ...

  constructor(page: Page) {
    this.page = page;
    // Initialize locators
  }

  // Navigation
  async goto() { /* ... */ }

  // Actions
  // ...

  // Assertions
  // ...
}
\`\`\``;

export const LOCATOR_SUGGESTION_PROMPT = `Analyze this HTML element and suggest the best Playwright locators.

## Element HTML
\`\`\`html
{{elementHtml}}
\`\`\`

## Context HTML (surrounding elements)
\`\`\`html
{{contextHtml}}
\`\`\`

## Requirements
Provide locators in order of preference (most stable first):
1. Primary locator (most stable)
2. Fallback locators (2-3 alternatives)
3. Explain why each locator is appropriate

## Output Format
\`\`\`json
{
  "primary": {
    "code": "page.getByTestId('...')",
    "reason": "Uses data-testid, most stable"
  },
  "fallbacks": [
    {
      "code": "page.getByRole('button', { name: '...' })",
      "reason": "Semantic, good accessibility"
    }
  ],
  "warnings": ["Any potential issues with these locators"]
}
\`\`\``;
