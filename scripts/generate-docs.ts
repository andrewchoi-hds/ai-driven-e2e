#!/usr/bin/env tsx
/**
 * Documentation Generator CLI
 *
 * 테스트 코드를 분석하여 Gherkin 형식의 문서를 자동 생성합니다.
 *
 * Usage:
 *   npx tsx scripts/generate-docs.ts [options]
 *
 * Options:
 *   --spec, -s     테스트 스펙 파일 또는 디렉토리
 *   --output, -o   출력 디렉토리 (default: reports/docs/features)
 *   --verbose, -v  상세 로깅
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { getAIClient } from '../core/ai-client.js';
import 'dotenv/config';

interface CLIOptions {
  specPath: string;
  outputDir: string;
  verbose: boolean;
}

interface ParsedTest {
  file: string;
  describe: string;
  tests: {
    name: string;
    code: string;
  }[];
}

async function parseArgs(): Promise<CLIOptions> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Documentation Generator - Convert tests to Gherkin documents

Usage:
  npx tsx scripts/generate-docs.ts [options]

Options:
  --spec, -s     Test spec file or directory (default: tests/specs)
  --output, -o   Output directory (default: reports/docs/features)
  --verbose, -v  Enable verbose logging
  --help, -h     Show this help message

Example:
  npx tsx scripts/generate-docs.ts -s tests/specs/auth -o reports/docs/features
    `);
    process.exit(0);
  }

  const options: CLIOptions = {
    specPath: 'tests/specs',
    outputDir: 'reports/docs/features',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--spec' || arg === '-s') {
      options.specPath = next;
      i++;
    } else if (arg === '--output' || arg === '-o') {
      options.outputDir = next;
      i++;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

async function parseTestFile(filePath: string): Promise<ParsedTest | null> {
  const content = await fs.readFile(filePath, 'utf-8');

  // describe 블록 추출
  const describeMatch = content.match(/test\.describe\(['"`](.+?)['"`]/);
  if (!describeMatch) return null;

  const describeName = describeMatch[1];

  // 개별 테스트 추출
  const testRegex = /test\(['"`](.+?)['"`],\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\);/g;
  const tests: ParsedTest['tests'] = [];

  let match;
  while ((match = testRegex.exec(content)) !== null) {
    tests.push({
      name: match[1],
      code: match[2].trim(),
    });
  }

  if (tests.length === 0) return null;

  return {
    file: filePath,
    describe: describeName,
    tests,
  };
}

async function generateGherkin(parsedTest: ParsedTest, verbose: boolean): Promise<string> {
  const aiClient = getAIClient();

  const testsDescription = parsedTest.tests.map((t, i) => `
### Test ${i + 1}: ${t.name}
\`\`\`typescript
${t.code}
\`\`\`
`).join('\n');

  const prompt = `Convert these Playwright E2E tests to Gherkin (BDD) format in KOREAN.

## Test Suite: ${parsedTest.describe}
## Source File: ${parsedTest.file}

${testsDescription}

## Requirements:
1. Feature와 Scenario 이름 및 설명을 모두 한국어로 작성
2. Given/When/Then을 한국어 키워드로 변환 (조건/만약/그러면)
3. 비개발자도 이해할 수 있는 명확한 한국어 표현 사용
4. 태그는 영어로 유지 (@smoke, @login 등)
5. # language: ko 헤더 포함

## Output Format:
Return ONLY the Gherkin feature file content, no markdown code blocks or explanations.

Example format:
# language: ko
@tagname
기능: 기능 이름
  사용자로서
  나는 무언가를 하고 싶다
  그래서 목표를 달성할 수 있다

  @test-tag
  시나리오: 시나리오 이름
    조건 어떤 전제조건이 있을 때
    만약 내가 무언가를 하면
    그러면 무언가가 일어나야 한다
`;

  if (verbose) {
    console.log(`  🤖 Generating Gherkin for: ${parsedTest.describe}`);
  }

  const response = await aiClient.complete(prompt, {
    system: 'You are a BDD expert. Convert technical test code to human-readable Gherkin scenarios. Output ONLY the .feature file content.',
    maxTokens: 2048,
  });

  // 코드 블록 제거 (혹시 있다면)
  let gherkin = response.trim();
  if (gherkin.startsWith('```gherkin')) {
    gherkin = gherkin.slice(10);
  } else if (gherkin.startsWith('```')) {
    gherkin = gherkin.slice(3);
  }
  if (gherkin.endsWith('```')) {
    gherkin = gherkin.slice(0, -3);
  }

  // 소스 파일 정보 추가
  gherkin += `\n\n# Source: ${parsedTest.file}`;
  gherkin += `\n# Generated: ${new Date().toISOString()}`;

  return gherkin.trim();
}

async function main() {
  const options = await parseArgs();

  console.log('\n📝 Documentation Generator\n');

  // 스펙 파일 찾기
  let specFiles: string[];
  const stat = await fs.stat(options.specPath).catch(() => null);

  if (stat?.isDirectory()) {
    specFiles = await glob(`${options.specPath}/**/*.spec.ts`);
  } else if (stat?.isFile()) {
    specFiles = [options.specPath];
  } else {
    console.error(`❌ Path not found: ${options.specPath}`);
    process.exit(1);
  }

  // broken 테스트 제외
  specFiles = specFiles.filter(f => !f.includes('broken'));

  console.log(`📂 Found ${specFiles.length} spec file(s)\n`);

  if (specFiles.length === 0) {
    console.log('No spec files found.');
    return;
  }

  // 출력 디렉토리 생성
  await fs.mkdir(options.outputDir, { recursive: true });

  let generatedCount = 0;

  for (const specFile of specFiles) {
    if (options.verbose) {
      console.log(`\n📄 Processing: ${specFile}`);
    }

    const parsed = await parseTestFile(specFile);
    if (!parsed) {
      if (options.verbose) {
        console.log(`  ⏭️  Skipped (no tests found)`);
      }
      continue;
    }

    try {
      const gherkin = await generateGherkin(parsed, options.verbose);

      // 파일명 생성
      const baseName = path.basename(specFile, '.spec.ts');
      const outputPath = path.join(options.outputDir, `${baseName}.feature`);

      await fs.writeFile(outputPath, gherkin);
      console.log(`✅ Generated: ${outputPath}`);
      generatedCount++;

    } catch (error) {
      console.error(`❌ Error processing ${specFile}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\n🏁 Done! Generated ${generatedCount} feature file(s)`);
  console.log(`📁 Output directory: ${options.outputDir}`);
}

main().catch(console.error);
