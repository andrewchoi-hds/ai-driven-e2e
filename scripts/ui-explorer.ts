#!/usr/bin/env tsx
/**
 * UI 자동 탐색기
 *
 * 현재 UI 상태를 자동으로 탐색하여:
 * 1. 페이지별 요소 수집
 * 2. 기존 POM과 비교하여 변경 감지
 * 3. 새로운 locator 제안
 *
 * Usage:
 *   npx tsx scripts/ui-explorer.ts [options]
 *
 * Options:
 *   --page, -p      탐색할 페이지 URL (예: /m/home)
 *   --all           모든 주요 페이지 탐색
 *   --update        POM 파일 자동 업데이트
 *   --report        변경 리포트 생성
 */

import { chromium, Page, Locator } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

interface UIElement {
  selector: string;
  text: string;
  tag: string;
  role?: string;
  testId?: string;
  className?: string;
  id?: string;
  isClickable: boolean;
  isVisible: boolean;
}

interface PageSnapshot {
  url: string;
  title: string;
  timestamp: string;
  elements: UIElement[];
  screenshot?: string;
}

interface UIChange {
  type: 'added' | 'removed' | 'modified';
  element: string;
  oldSelector?: string;
  newSelector?: string;
  suggestion?: string;
}

const PAGES_TO_EXPLORE = [
  { name: 'login', url: '/login', requiresAuth: false },
  { name: 'home', url: '/m/home', requiresAuth: true },
  { name: 'mypage', url: '/m/my', requiresAuth: true },
  { name: 'life', url: '/m/life', requiresAuth: true },
  { name: 'benefit', url: '/m/benefit', requiresAuth: true },
];

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

async function collectElements(page: Page): Promise<UIElement[]> {
  const elements: UIElement[] = [];
  const seenSelectors = new Set<string>();

  // 헬퍼: 요소 추가 (중복 방지)
  const addElement = (el: UIElement) => {
    if (el.selector && !seenSelectors.has(el.selector)) {
      seenSelectors.add(el.selector);
      elements.push(el);
    }
  };

  // 1. 클릭 가능한 기본 요소들 수집
  const clickables = await page.locator('button, a, [role="button"], [onclick], input[type="submit"]').all();

  for (const el of clickables) {
    try {
      const isVisible = await el.isVisible().catch(() => false);
      if (!isVisible) continue;

      const text = await el.textContent().catch(() => '') || '';
      const tag = await el.evaluate((e) => e.tagName.toLowerCase());
      const role = await el.getAttribute('role');
      const testId = await el.getAttribute('data-testid');
      const className = await el.getAttribute('class');
      const id = await el.getAttribute('id');

      let selector = '';
      if (testId) {
        selector = `[data-testid="${testId}"]`;
      } else if (id) {
        selector = `#${id}`;
      } else if (role && text.trim()) {
        selector = `getByRole('${role}', { name: '${text.trim().substring(0, 30)}' })`;
      } else if (text.trim()) {
        selector = `getByText('${text.trim().substring(0, 30)}')`;
      } else if (className) {
        const mainClass = className.split(' ')[0];
        selector = `.${mainClass}`;
      }

      addElement({
        selector,
        text: text.trim().substring(0, 50),
        tag,
        role: role || undefined,
        testId: testId || undefined,
        className: className || undefined,
        id: id || undefined,
        isClickable: true,
        isVisible: true,
      });
    } catch (e) {
      // Skip problematic elements
    }
  }

  // 2. 메뉴 아이템 수집 (div, span 기반 - MyPage, Life 페이지용)
  const menuKeywords = [
    // MyPage 영문 메뉴 (전체 텍스트)
    'My Point Balance', 'Payment details', 'Help Center',
    'Terms and Conditions', 'Privacy Policy', 'Sign out', 'Refund Policy',
    // MyPage 한글 메뉴
    '내 보유 포인트', '결제 내역', '헬프 센터',
    '서비스 이용 약관', '개인정보처리방침', '로그아웃', '환불 정책',
    // MyPage 부분 매칭
    'My Point', 'Payment', 'Help', 'Terms', 'Privacy', 'Refund',
    '포인트', '결제', '헬프', '약관', '개인정보', '환불',
    // Life 페이지
    'Guide to Life', 'K-Life', 'Support Event',
    '한국 생활 가이드', '가이드', '할인', '절약', '여행', '숙박', '영화', '약국',
    // 네비게이션
    'Home', 'LIFE', 'Benefits', 'My Page', '홈', '라이프', '혜택', '마이페이지',
    // 공통 UI 요소
    'QR', 'Settings', '설정', 'FAQ',
  ];

  for (const keyword of menuKeywords) {
    try {
      const menuItems = await page.locator(`text=${keyword}`).all();
      for (const el of menuItems) {
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;

        const text = await el.textContent().catch(() => '') || '';
        const tag = await el.evaluate((e) => e.tagName.toLowerCase());
        const testId = await el.getAttribute('data-testid');
        const id = await el.getAttribute('id');

        let selector = '';
        if (testId) {
          selector = `[data-testid="${testId}"]`;
        } else if (id) {
          selector = `#${id}`;
        } else {
          selector = `getByText('${text.trim().substring(0, 30)}')`;
        }

        addElement({
          selector,
          text: text.trim().substring(0, 50),
          tag,
          testId: testId || undefined,
          id: id || undefined,
          isClickable: true,
          isVisible: true,
        });
      }
    } catch (e) {
      // Skip if keyword not found
    }
  }

  // 3. 하단 네비게이션 바 수집
  const navSelectors = [
    'nav a', 'nav button', '[role="navigation"] a', '[role="navigation"] button',
    '[class*="nav"] a', '[class*="nav"] button', '[class*="bottom"] a', '[class*="tab"] a',
  ];

  for (const navSelector of navSelectors) {
    try {
      const navItems = await page.locator(navSelector).all();
      for (const el of navItems) {
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;

        const text = await el.textContent().catch(() => '') || '';
        if (!text.trim()) continue;

        const tag = await el.evaluate((e) => e.tagName.toLowerCase());
        const href = await el.getAttribute('href');

        const selector = href
          ? `a[href="${href}"]`
          : `getByText('${text.trim().substring(0, 30)}')`;

        addElement({
          selector,
          text: text.trim().substring(0, 50),
          tag,
          isClickable: true,
          isVisible: true,
        });
      }
    } catch (e) {
      // Skip if selector not found
    }
  }

  // 4. 카드/리스트 아이템 수집 (클릭 가능한 컨테이너)
  const cardSelectors = [
    '[class*="card"]', '[class*="item"]', '[class*="menu"]', '[class*="list"] > div',
    '[class*="Card"]', '[class*="Item"]', '[class*="Menu"]',
  ];

  for (const cardSelector of cardSelectors) {
    try {
      const cards = await page.locator(cardSelector).all();
      for (const el of cards) {
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;

        const text = await el.textContent().catch(() => '') || '';
        if (!text.trim() || text.length > 100) continue; // 너무 긴 텍스트는 컨테이너일 가능성

        const tag = await el.evaluate((e) => e.tagName.toLowerCase());
        const testId = await el.getAttribute('data-testid');
        const className = await el.getAttribute('class');

        let selector = '';
        if (testId) {
          selector = `[data-testid="${testId}"]`;
        } else if (text.trim().length < 50) {
          selector = `getByText('${text.trim().substring(0, 30)}')`;
        } else if (className) {
          const mainClass = className.split(' ')[0];
          selector = `.${mainClass}`;
        }

        if (selector) {
          addElement({
            selector,
            text: text.trim().substring(0, 50),
            tag,
            className: className || undefined,
            testId: testId || undefined,
            isClickable: true,
            isVisible: true,
          });
        }
      }
    } catch (e) {
      // Skip if selector not found
    }
  }

  // 5. 입력 필드 수집
  const inputs = await page.locator('input, textarea, select').all();

  for (const el of inputs) {
    try {
      const isVisible = await el.isVisible().catch(() => false);
      if (!isVisible) continue;

      const tag = await el.evaluate((e) => e.tagName.toLowerCase());
      const type = await el.getAttribute('type') || 'text';
      const name = await el.getAttribute('name');
      const id = await el.getAttribute('id');
      const placeholder = await el.getAttribute('placeholder');
      const testId = await el.getAttribute('data-testid');

      let selector = '';
      if (testId) {
        selector = `[data-testid="${testId}"]`;
      } else if (id) {
        selector = `#${id}`;
      } else if (name) {
        selector = `[name="${name}"]`;
      } else if (placeholder) {
        selector = `getByPlaceholder('${placeholder.substring(0, 30)}')`;
      }

      addElement({
        selector,
        text: placeholder || name || '',
        tag,
        testId: testId || undefined,
        id: id || undefined,
        isClickable: false,
        isVisible: true,
      });
    } catch (e) {
      // Skip problematic elements
    }
  }

  return elements;
}

async function explorePages(options: { all?: boolean; page?: string; update?: boolean; report?: boolean }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL || 'http://qa.hirevisa.com',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  const snapshots: PageSnapshot[] = [];
  const changes: UIChange[] = [];

  try {
    // 로그인
    console.log('🔐 로그인 중...');
    const loggedIn = await login(page);

    if (!loggedIn) {
      console.error('❌ 로그인 실패');
      return;
    }

    console.log('✅ 로그인 성공\n');

    // 탐색할 페이지 결정
    let pagesToExplore = PAGES_TO_EXPLORE;

    if (options.page) {
      pagesToExplore = [{ name: 'custom', url: options.page, requiresAuth: true }];
    } else if (!options.all) {
      // 기본값: 홈 페이지만
      pagesToExplore = [PAGES_TO_EXPLORE.find((p) => p.name === 'home')!];
    }

    // 각 페이지 탐색
    for (const pageInfo of pagesToExplore) {
      console.log(`📄 탐색 중: ${pageInfo.name} (${pageInfo.url})`);

      try {
        await page.goto(pageInfo.url);
        await page.waitForTimeout(3000);

        const title = await page.title();
        const elements = await collectElements(page);

        // 스크린샷 저장
        const screenshotDir = 'reports/ui-snapshots';
        await fs.mkdir(screenshotDir, { recursive: true });
        const screenshotPath = path.join(screenshotDir, `${pageInfo.name}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const snapshot: PageSnapshot = {
          url: pageInfo.url,
          title,
          timestamp: new Date().toISOString(),
          elements,
          screenshot: screenshotPath,
        };

        snapshots.push(snapshot);

        console.log(`   ✅ ${elements.length}개 요소 발견`);
        console.log(`   📸 스크린샷: ${screenshotPath}`);

        // 기존 스냅샷과 비교
        const previousSnapshotPath = `reports/ui-snapshots/${pageInfo.name}-latest.json`;
        try {
          const previousData = await fs.readFile(previousSnapshotPath, 'utf-8');
          const previous: PageSnapshot = JSON.parse(previousData);

          // 변경 감지
          const previousSelectors = new Set(previous.elements.map((e) => e.selector));
          const currentSelectors = new Set(elements.map((e) => e.selector));

          for (const el of elements) {
            if (!previousSelectors.has(el.selector)) {
              changes.push({
                type: 'added',
                element: el.text || el.selector,
                newSelector: el.selector,
                suggestion: `새 요소 발견: ${el.selector}`,
              });
            }
          }

          for (const el of previous.elements) {
            if (!currentSelectors.has(el.selector)) {
              changes.push({
                type: 'removed',
                element: el.text || el.selector,
                oldSelector: el.selector,
                suggestion: `요소 제거됨 - POM 업데이트 필요`,
              });
            }
          }

          if (changes.length > 0) {
            console.log(`   ⚠️ ${changes.length}개 변경 감지!`);
          }
        } catch (e) {
          console.log(`   ℹ️ 이전 스냅샷 없음 (첫 탐색)`);
        }

        // 최신 스냅샷 저장
        await fs.writeFile(previousSnapshotPath, JSON.stringify(snapshot, null, 2));
      } catch (e) {
        console.log(`   ❌ 탐색 실패: ${e}`);
      }

      console.log('');
    }

    // 리포트 생성
    if (options.report) {
      const report = generateReport(snapshots, changes);
      const reportPath = 'reports/ui-explorer-report.md';
      await fs.writeFile(reportPath, report);
      console.log(`📝 리포트 생성: ${reportPath}`);
    }

    // 결과 요약
    console.log('\n📊 탐색 결과 요약:');
    console.log(`   페이지: ${snapshots.length}개`);
    console.log(`   총 요소: ${snapshots.reduce((sum, s) => sum + s.elements.length, 0)}개`);
    console.log(`   변경 감지: ${changes.length}개`);

    if (changes.length > 0) {
      console.log('\n⚠️ 감지된 변경:');
      for (const change of changes.slice(0, 10)) {
        console.log(`   ${change.type === 'added' ? '➕' : '➖'} ${change.element}`);
      }
      if (changes.length > 10) {
        console.log(`   ... 외 ${changes.length - 10}개`);
      }
    }
  } finally {
    await browser.close();
  }
}

function generateReport(snapshots: PageSnapshot[], changes: UIChange[]): string {
  const lines = [
    '# UI 탐색 리포트',
    '',
    `> 생성 시간: ${new Date().toISOString()}`,
    '',
    '## 탐색된 페이지',
    '',
  ];

  for (const snapshot of snapshots) {
    lines.push(`### ${snapshot.url}`);
    lines.push('');
    lines.push(`- **제목**: ${snapshot.title}`);
    lines.push(`- **요소 수**: ${snapshot.elements.length}개`);
    lines.push(`- **스크린샷**: ${snapshot.screenshot}`);
    lines.push('');

    // 주요 요소 목록
    lines.push('**주요 요소:**');
    lines.push('');
    lines.push('| Selector | Text | Tag |');
    lines.push('|----------|------|-----|');

    for (const el of snapshot.elements.slice(0, 20)) {
      lines.push(`| \`${el.selector}\` | ${el.text.substring(0, 30)} | ${el.tag} |`);
    }

    if (snapshot.elements.length > 20) {
      lines.push(`| ... | 외 ${snapshot.elements.length - 20}개 | |`);
    }

    lines.push('');
  }

  if (changes.length > 0) {
    lines.push('## 감지된 변경');
    lines.push('');

    for (const change of changes) {
      const icon = change.type === 'added' ? '➕' : change.type === 'removed' ? '➖' : '🔄';
      lines.push(`${icon} **${change.type}**: ${change.element}`);
      if (change.oldSelector) lines.push(`   - 이전: \`${change.oldSelector}\``);
      if (change.newSelector) lines.push(`   - 현재: \`${change.newSelector}\``);
      if (change.suggestion) lines.push(`   - 제안: ${change.suggestion}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
UI 자동 탐색기 - 현재 UI 상태를 탐색하고 변경 감지

Usage:
  npx tsx scripts/ui-explorer.ts [options]

Options:
  --page, -p <url>  특정 페이지만 탐색 (예: /m/home)
  --all             모든 주요 페이지 탐색
  --update          POM 파일 자동 업데이트
  --report          변경 리포트 생성
  --help, -h        도움말

Example:
  npx tsx scripts/ui-explorer.ts --all --report
  npx tsx scripts/ui-explorer.ts -p /m/home
    `);
    process.exit(0);
  }

  const options: { all?: boolean; page?: string; update?: boolean; report?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') options.all = true;
    if (args[i] === '--update') options.update = true;
    if (args[i] === '--report') options.report = true;
    if ((args[i] === '--page' || args[i] === '-p') && args[i + 1]) {
      options.page = args[i + 1];
      i++;
    }
  }

  console.log('\n🔍 UI 자동 탐색기\n');
  await explorePages(options);
}

main().catch(console.error);
