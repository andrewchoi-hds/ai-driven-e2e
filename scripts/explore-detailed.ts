#!/usr/bin/env tsx
/**
 * 상세 앱 탐색 - 모든 버튼과 링크를 파악합니다.
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://qa.hirevisa.com';

async function main() {
  console.log('\n🔍 상세 앱 탐색\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 로그인
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);
    await page.locator('#email').fill('test21@aaaa.com');
    await page.locator('#password').fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForTimeout(3000);

    console.log(`✅ 로그인 완료: ${page.url()}\n`);

    // 모든 버튼 텍스트 수집
    console.log('📍 모든 버튼:');
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      try {
        const text = (await btn.textContent())?.trim();
        const ariaLabel = await btn.getAttribute('aria-label');
        if (text || ariaLabel) {
          console.log(`   - "${text || ariaLabel}"`);
        }
      } catch {}
    }

    // 하단 탭바/네비게이션 찾기
    console.log('\n📍 하단 네비게이션 영역:');
    const bottomNav = await page.locator('[class*="tab"], [class*="nav"], [class*="bottom"], [role="tablist"]').all();
    for (const nav of bottomNav) {
      try {
        const buttons = await nav.locator('button, a').all();
        for (const btn of buttons) {
          const text = (await btn.textContent())?.trim();
          if (text && text.length < 20) {
            console.log(`   - "${text}"`);
          }
        }
      } catch {}
    }

    // 스크린샷 저장
    await fs.mkdir('reports/exploration', { recursive: true });
    await page.screenshot({ path: 'reports/exploration/home-full.png', fullPage: true });
    console.log('\n📸 홈 화면 스크린샷 저장됨');

    // HTML 저장 (분석용)
    const html = await page.content();
    await fs.writeFile('reports/exploration/home.html', html);
    console.log('📄 HTML 저장됨: reports/exploration/home.html');

    // 특정 클래스나 역할로 네비게이션 탐색
    console.log('\n📍 role="tab" 또는 role="button" 요소:');
    const tabs = await page.locator('[role="tab"], [role="button"]').all();
    for (const tab of tabs.slice(0, 20)) {
      try {
        const text = (await tab.textContent())?.trim();
        if (text && text.length < 30) {
          console.log(`   - "${text}"`);
        }
      } catch {}
    }

    // 페이지 내 링크들
    console.log('\n📍 내부 링크:');
    const links = await page.locator('a[href^="/"]').all();
    const uniqueHrefs = new Set<string>();
    for (const link of links) {
      try {
        const href = await link.getAttribute('href');
        const text = (await link.textContent())?.trim();
        if (href && !uniqueHrefs.has(href)) {
          uniqueHrefs.add(href);
          console.log(`   - ${href} ${text ? `(${text.slice(0, 30)})` : ''}`);
        }
      } catch {}
    }

    // 네비게이션 클릭 테스트
    console.log('\n🔄 네비게이션 탐색...');

    // 홈, 라이프, 혜택, 마이페이지 텍스트로 찾기
    const navTexts = ['Home', 'LIFE', 'Life', 'Benefits', 'My Page', 'MyPage', '홈', '라이프', '혜택', '마이페이지', '마이'];

    for (const text of navTexts) {
      try {
        const element = page.locator(`button:has-text("${text}"), a:has-text("${text}")`).first();
        if (await element.count() > 0) {
          console.log(`\n   클릭: "${text}"`);
          await element.click();
          await page.waitForTimeout(2000);
          console.log(`   → URL: ${page.url()}`);

          // 스크린샷
          const safeName = text.toLowerCase().replace(/\s+/g, '-');
          await page.screenshot({ path: `reports/exploration/page-${safeName}.png`, fullPage: true });
        }
      } catch (e) {
        // 무시
      }
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
