#!/usr/bin/env tsx
/**
 * Visual Regression 테스트
 *
 * 스크린샷 비교를 통해 UI 변경 감지
 *
 * Usage:
 *   npx tsx scripts/visual-regression.ts [options]
 *
 * Options:
 *   --update        기준 스크린샷 업데이트
 *   --threshold     차이 허용치 (0-1, 기본: 0.1)
 *   --report        diff 리포트 생성
 */

import { chromium, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

interface ComparisonResult {
  page: string;
  url: string;
  baseline: string;
  current: string;
  diff?: string;
  diffPixels: number;
  diffPercent: number;
  passed: boolean;
}

const PAGES_TO_CAPTURE = [
  { name: 'login', url: '/login', requiresAuth: false },
  { name: 'home', url: '/m/home', requiresAuth: true },
  { name: 'mypage', url: '/m/my', requiresAuth: true },
  { name: 'life', url: '/m/life', requiresAuth: true },
  { name: 'benefit', url: '/m/benefit', requiresAuth: true },
];

const BASELINE_DIR = 'reports/visual-baseline';
const CURRENT_DIR = 'reports/visual-current';
const DIFF_DIR = 'reports/visual-diff';

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto('/login');
    await page.waitForTimeout(2000);

    await page.fill('#email', 'aiqa1@aaa.com');
    await page.fill('#password', 'qwer1234');

    const loginBtn = page.getByRole('button', { name: /Log in|로그인/i });
    await loginBtn.click();

    await page.waitForURL('**/home', { timeout: 15000 });
    return true;
  } catch (e) {
    console.error('로그인 실패:', e);
    return false;
  }
}

async function captureScreenshots(
  page: Page,
  outputDir: string
): Promise<Map<string, string>> {
  const screenshots = new Map<string, string>();

  await fs.mkdir(outputDir, { recursive: true });

  for (const pageInfo of PAGES_TO_CAPTURE) {
    try {
      console.log(`   📸 ${pageInfo.name}...`);
      await page.goto(pageInfo.url);
      await page.waitForTimeout(3000);

      const screenshotPath = path.join(outputDir, `${pageInfo.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.set(pageInfo.name, screenshotPath);
    } catch (e) {
      console.log(`   ❌ ${pageInfo.name} 캡처 실패: ${e}`);
    }
  }

  return screenshots;
}

async function compareImages(
  baseline: string,
  current: string,
  diffPath: string,
  threshold: number
): Promise<{ diffPixels: number; diffPercent: number }> {
  // PNG 파일을 raw 바이트로 읽어서 간단한 비교
  // 실제 프로덕션에서는 pixelmatch나 looks-same 같은 라이브러리 사용 권장

  try {
    const baselineBuffer = await fs.readFile(baseline);
    const currentBuffer = await fs.readFile(current);

    // 간단한 바이트 비교
    const minLength = Math.min(baselineBuffer.length, currentBuffer.length);
    let diffBytes = Math.abs(baselineBuffer.length - currentBuffer.length);

    for (let i = 0; i < minLength; i++) {
      if (baselineBuffer[i] !== currentBuffer[i]) {
        diffBytes++;
      }
    }

    const totalBytes = Math.max(baselineBuffer.length, currentBuffer.length);
    const diffPercent = (diffBytes / totalBytes) * 100;

    // Diff 이미지는 current를 복사 (실제로는 diff 이미지 생성해야 함)
    if (diffPercent > threshold * 100) {
      await fs.copyFile(current, diffPath);
    }

    return { diffPixels: diffBytes, diffPercent };
  } catch (e) {
    return { diffPixels: -1, diffPercent: 100 };
  }
}

async function runVisualRegression(options: {
  update?: boolean;
  threshold?: number;
  report?: boolean;
}): Promise<ComparisonResult[]> {
  const threshold = options.threshold || 0.1;
  const results: ComparisonResult[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL || 'http://qa.hirevisa.com',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  try {
    // 로그인
    console.log('🔐 로그인 중...');
    const loggedIn = await login(page);

    if (!loggedIn) {
      console.error('❌ 로그인 실패');
      return results;
    }

    console.log('✅ 로그인 성공\n');

    if (options.update) {
      // 기준 스크린샷 업데이트
      console.log('📸 기준 스크린샷 업데이트 중...');
      await captureScreenshots(page, BASELINE_DIR);
      console.log(`\n✅ 기준 스크린샷 저장: ${BASELINE_DIR}`);
    } else {
      // 현재 스크린샷 캡처 및 비교
      console.log('📸 현재 스크린샷 캡처 중...');
      const currentScreenshots = await captureScreenshots(page, CURRENT_DIR);

      console.log('\n🔍 비교 중...\n');
      await fs.mkdir(DIFF_DIR, { recursive: true });

      for (const [pageName, currentPath] of currentScreenshots) {
        const baselinePath = path.join(BASELINE_DIR, `${pageName}.png`);
        const diffPath = path.join(DIFF_DIR, `${pageName}-diff.png`);

        try {
          await fs.access(baselinePath);

          const { diffPixels, diffPercent } = await compareImages(
            baselinePath,
            currentPath,
            diffPath,
            threshold
          );

          const passed = diffPercent <= threshold * 100;

          results.push({
            page: pageName,
            url: PAGES_TO_CAPTURE.find((p) => p.name === pageName)?.url || '',
            baseline: baselinePath,
            current: currentPath,
            diff: passed ? undefined : diffPath,
            diffPixels,
            diffPercent,
            passed,
          });

          const icon = passed ? '✅' : '❌';
          console.log(
            `   ${icon} ${pageName}: ${diffPercent.toFixed(2)}% 차이 ${passed ? '(통과)' : '(실패)'}`
          );
        } catch (e) {
          console.log(`   ⚠️ ${pageName}: 기준 스크린샷 없음 (--update 필요)`);
          results.push({
            page: pageName,
            url: PAGES_TO_CAPTURE.find((p) => p.name === pageName)?.url || '',
            baseline: baselinePath,
            current: currentPath,
            diffPixels: -1,
            diffPercent: 100,
            passed: false,
          });
        }
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

function generateReport(results: ComparisonResult[]): string {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  const lines = [
    '# Visual Regression 리포트',
    '',
    `> 생성 시간: ${new Date().toISOString()}`,
    '',
    '## 요약',
    '',
    `| 항목 | 값 |`,
    `|------|-----|`,
    `| 총 페이지 | ${results.length} |`,
    `| 통과 | ${passed} |`,
    `| 실패 | ${failed} |`,
    '',
    '## 상세 결과',
    '',
  ];

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    lines.push(`### ${icon} ${result.page}`);
    lines.push('');
    lines.push(`- **URL**: ${result.url}`);
    lines.push(`- **차이**: ${result.diffPercent.toFixed(2)}%`);
    lines.push(`- **상태**: ${result.passed ? '통과' : '실패'}`);

    if (!result.passed && result.diff) {
      lines.push(`- **Diff 이미지**: ${result.diff}`);
    }

    lines.push('');
    lines.push('| Baseline | Current |');
    lines.push('|----------|---------|');
    lines.push(`| ![baseline](${result.baseline}) | ![current](${result.current}) |`);
    lines.push('');
  }

  return lines.join('\n');
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Visual Regression 테스트 - 스크린샷 비교로 UI 변경 감지

Usage:
  npx tsx scripts/visual-regression.ts [options]

Options:
  --update          기준 스크린샷 업데이트
  --threshold <n>   차이 허용치 (0-1, 기본: 0.1)
  --report          diff 리포트 생성
  --help, -h        도움말

Example:
  npx tsx scripts/visual-regression.ts --update     # 기준 스크린샷 설정
  npx tsx scripts/visual-regression.ts --report     # 비교 및 리포트 생성
    `);
    process.exit(0);
  }

  const options: { update?: boolean; threshold?: number; report?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--update') options.update = true;
    if (args[i] === '--report') options.report = true;
    if (args[i] === '--threshold' && args[i + 1]) {
      options.threshold = parseFloat(args[i + 1]);
      i++;
    }
  }

  console.log('\n📊 Visual Regression 테스트\n');

  const results = await runVisualRegression(options);

  if (options.report && results.length > 0) {
    const report = generateReport(results);
    const reportPath = 'reports/visual-regression-report.md';
    await fs.writeFile(reportPath, report);
    console.log(`\n📝 리포트 생성: ${reportPath}`);
  }

  // 결과 요약
  if (!options.update && results.length > 0) {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log('\n📊 결과 요약:');
    console.log(`   통과: ${passed}개`);
    console.log(`   실패: ${failed}개`);

    if (failed > 0) {
      console.log('\n⚠️ UI 변경이 감지되었습니다!');
      console.log('   - 의도된 변경이면: npx tsx scripts/visual-regression.ts --update');
      console.log('   - 버그면: 코드 수정 필요');
    }
  }
}

main().catch(console.error);
