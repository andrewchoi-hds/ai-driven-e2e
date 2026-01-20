#!/usr/bin/env tsx
/**
 * 앱 탐색 스크립트 - 로그인 후 접근 가능한 화면들을 탐색합니다.
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://qa.hirevisa.com';
const TEST_EMAIL = 'test21@aaaa.com';
const TEST_PASSWORD = 'qwer1234';

interface PageInfo {
  url: string;
  title: string;
  navigation: string[];
  mainElements: string[];
  forms: string[];
  buttons: string[];
}

async function main() {
  console.log('\n🔍 앱 탐색 시작\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const discoveredPages: PageInfo[] = [];
  const visitedUrls = new Set<string>();

  try {
    // 1. 로그인
    console.log('📝 로그인 중...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);

    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();

    // 로그인 완료 대기
    await page.waitForTimeout(3000);
    console.log(`✅ 로그인 완료! 현재 URL: ${page.url()}\n`);

    // 2. 현재 페이지(홈/대시보드) 분석
    const homePage = await analyzePage(page);
    discoveredPages.push(homePage);
    visitedUrls.add(new URL(page.url()).pathname);

    console.log('📱 발견된 네비게이션:', homePage.navigation);

    // 3. 네비게이션 링크들 탐색
    const navLinks = await page.locator('nav a, [role="navigation"] a, button[role="tab"], .nav-item, a[href^="/"]').all();
    const linkInfos: { text: string; href: string }[] = [];

    for (const link of navLinks) {
      try {
        const text = await link.textContent() || '';
        const href = await link.getAttribute('href') || '';
        if (href && !href.startsWith('http') && !visitedUrls.has(href)) {
          linkInfos.push({ text: text.trim(), href });
        }
      } catch {
        // 무시
      }
    }

    // 하단 네비게이션 버튼들 확인
    const bottomNavButtons = await page.locator('[class*="bottom"] button, footer button, [role="tablist"] button').all();
    for (const btn of bottomNavButtons) {
      try {
        const text = await btn.textContent() || '';
        if (text.trim()) {
          console.log(`  📍 하단 네비게이션: ${text.trim()}`);
        }
      } catch {
        // 무시
      }
    }

    // 4. 각 네비게이션 페이지 탐색
    console.log('\n🔄 페이지 탐색 중...\n');

    // 주요 네비게이션 클릭해서 탐색
    const mainNavItems = ['Home', 'LIFE', 'Benefits', 'My Page', '홈', '라이프', '혜택', '마이페이지'];

    for (const navItem of mainNavItems) {
      try {
        const navButton = page.getByRole('button', { name: navItem });
        if (await navButton.count() > 0) {
          await navButton.click();
          await page.waitForTimeout(2000);

          const currentPath = new URL(page.url()).pathname;
          if (!visitedUrls.has(currentPath)) {
            visitedUrls.add(currentPath);
            const pageInfo = await analyzePage(page);
            discoveredPages.push(pageInfo);
            console.log(`✅ ${navItem} 페이지 분석 완료: ${page.url()}`);
          }
        }
      } catch {
        // 무시
      }
    }

    // 5. 결과 출력
    console.log('\n' + '='.repeat(60));
    console.log('📊 탐색 결과 요약');
    console.log('='.repeat(60) + '\n');

    for (const pageInfo of discoveredPages) {
      console.log(`\n📄 ${pageInfo.title || '제목 없음'}`);
      console.log(`   URL: ${pageInfo.url}`);
      console.log(`   버튼: ${pageInfo.buttons.slice(0, 5).join(', ') || '없음'}`);
      console.log(`   폼: ${pageInfo.forms.length > 0 ? '있음' : '없음'}`);
    }

    // 6. 결과 파일 저장
    const result = {
      exploredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      pages: discoveredPages,
    };

    await fs.mkdir('reports/exploration', { recursive: true });
    await fs.writeFile(
      'reports/exploration/app-structure.json',
      JSON.stringify(result, null, 2)
    );

    console.log('\n📁 탐색 결과 저장됨: reports/exploration/app-structure.json');

    // 스크린샷 저장
    for (const navItem of ['Home', 'LIFE', 'Benefits', 'My Page']) {
      try {
        const navButton = page.getByRole('button', { name: navItem });
        if (await navButton.count() > 0) {
          await navButton.click();
          await page.waitForTimeout(1500);
          const safeName = navItem.toLowerCase().replace(/\s+/g, '-');
          await page.screenshot({ path: `reports/exploration/${safeName}.png`, fullPage: true });
          console.log(`📸 스크린샷 저장: ${safeName}.png`);
        }
      } catch {
        // 무시
      }
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await browser.close();
  }
}

async function analyzePage(page: import('playwright').Page): Promise<PageInfo> {
  const url = page.url();
  const title = await page.title();

  // 네비게이션 요소들
  const navigation: string[] = [];
  const navElements = await page.locator('nav a, [role="navigation"] a, [role="tab"]').all();
  for (const el of navElements.slice(0, 10)) {
    try {
      const text = await el.textContent();
      if (text?.trim()) navigation.push(text.trim());
    } catch {
      // 무시
    }
  }

  // 주요 요소들
  const mainElements: string[] = [];
  const headings = await page.locator('h1, h2, h3').all();
  for (const h of headings.slice(0, 5)) {
    try {
      const text = await h.textContent();
      if (text?.trim()) mainElements.push(text.trim());
    } catch {
      // 무시
    }
  }

  // 폼 필드
  const forms: string[] = [];
  const inputs = await page.locator('input, select, textarea').all();
  for (const input of inputs.slice(0, 10)) {
    try {
      const name = await input.getAttribute('name') || await input.getAttribute('placeholder') || await input.getAttribute('id');
      if (name) forms.push(name);
    } catch {
      // 무시
    }
  }

  // 버튼들
  const buttons: string[] = [];
  const btnElements = await page.locator('button, [role="button"]').all();
  for (const btn of btnElements.slice(0, 15)) {
    try {
      const text = await btn.textContent();
      if (text?.trim() && text.trim().length < 30) buttons.push(text.trim());
    } catch {
      // 무시
    }
  }

  return { url, title, navigation, mainElements, forms, buttons };
}

main().catch(console.error);
