export const FLOW_ANALYZER_SYSTEM_PROMPT = `You are an expert test architect who designs comprehensive E2E test scenarios.
Your task is to analyze user requirements and web pages to generate test specifications.

## Expertise
1. User journey mapping
2. Edge case identification
3. Test coverage optimization
4. BDD/Gherkin scenario writing
5. Risk-based test prioritization

## Principles
1. Cover happy paths first, then edge cases
2. Consider both positive and negative scenarios
3. Group related tests logically
4. Identify data dependencies
5. Consider authentication and authorization flows`;

export const FLOW_ANALYSIS_PROMPT = `Analyze this page and user requirement to generate test scenarios.

## User Requirement
{{requirement}}

## Page URL
{{url}}

## Page HTML
\`\`\`html
{{html}}
\`\`\`

## Existing Tests (if any)
{{existingTests}}

## Tasks
1. Identify all possible user flows on this page
2. Map the requirement to specific interactions
3. Generate test scenarios covering:
   - Happy path
   - Edge cases
   - Error scenarios
   - Boundary conditions

## Output Format
\`\`\`json
{
  "analysis": {
    "pageType": "login | dashboard | form | list | detail | etc",
    "mainFeatures": ["feature1", "feature2"],
    "userJourneys": [
      {
        "name": "Journey name",
        "steps": ["Step 1", "Step 2"],
        "endpoints": ["Entry point", "Exit point"]
      }
    ]
  },
  "testScenarios": [
    {
      "name": "Test name",
      "priority": "critical | high | medium | low",
      "type": "happy_path | edge_case | error | boundary",
      "description": "What this test verifies",
      "preconditions": ["Required state before test"],
      "steps": [
        {
          "action": "User action",
          "locator": "Playwright locator",
          "expected": "Expected result"
        }
      ],
      "assertions": ["What to verify at the end"]
    }
  ],
  "coverage": {
    "features": {"feature1": ["test1", "test2"]},
    "gaps": ["Identified gaps in coverage"]
  }
}
\`\`\``;

export const TEST_GENERATION_PROMPT = `Generate Playwright test code from this scenario.

## Scenario
{{scenario}}

## Page Object
{{pageObject}}

## Test Configuration
- Framework: Playwright Test
- Language: TypeScript
- Style: {{testStyle}}

## Requirements
1. Use the provided Page Object for interactions
2. Include proper test setup and teardown
3. Add meaningful assertions
4. Handle async operations correctly
5. Follow Playwright best practices

## Output
Generate complete, runnable Playwright test code:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { {{PageClass}} } from '../pages/{{PageFile}}';

test.describe('{{suiteName}}', () => {
  // Test implementation
});
\`\`\``;
