#!/usr/bin/env tsx
/**
 * 네비게이션 탐색 - 하단 탭바와 각 페이지 구조를 파악합니다.
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://qa.hirevisa.com';

interface PageStructure {
  name: string;
  url: string;
  headings: string[];
  buttons: string[];
  links: string[];
  forms: { name: string; type: string }[];
}

async function main() {
  console.log('\n🔍 네비게이션 탐색 시작\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const pages: PageStructure[] = [];

  try {
    // 로그인
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);
    await page.locator('#email').fill('test21@aaaa.com');
    await page.locator('#password').fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForTimeout(3000);

    console.log(`✅ 로그인 완료: ${page.url()}\n`);

    // 하단 네비게이션 버튼 찾기 - 다양한 방법 시도
    console.log('📍 하단 네비게이션 찾기...\n');

    // 방법 1: 텍스트로 찾기
    const navItems = ['홈', '라이프', '혜택', '마이페이지'];

    for (const navText of navItems) {
      try {
        // 다양한 셀렉터 시도
        let navElement = page.locator(`text="${navText}"`).first();

        if (await navElement.count() === 0) {
          navElement = page.getByText(navText, { exact: true }).first();
        }

        if (await navElement.count() > 0) {
          // 부모 요소 정보 확인
          const boundingBox = await navElement.boundingBox();
          console.log(`✅ "${navText}" 발견 - 위치: y=${boundingBox?.y}`);

          // 클릭 가능한 요소 찾기
          const clickable = page.locator(`button:has-text("${navText}"), a:has-text("${navText}"), [role="tab"]:has-text("${navText}")`).first();

          if (await clickable.count() > 0) {
            console.log(`   → 클릭 시도: "${navText}"`);
            await clickable.click();
            await page.waitForTimeout(2000);

            const currentUrl = page.url();
            console.log(`   → URL: ${currentUrl}`);

            // 페이지 구조 분석
            const structure = await analyzePage(page, navText);
            pages.push(structure);

            // 스크린샷 저장
            await page.screenshot({
              path: `reports/exploration/nav-${navText}.png`,
              fullPage: true
            });
            console.log(`   → 스크린샷 저장: nav-${navText}.png\n`);
          }
        } else {
          console.log(`❌ "${navText}" 찾을 수 없음`);
        }
      } catch (e) {
        console.log(`❌ "${navText}" 탐색 오류:`, (e as Error).message);
      }
    }

    // 결과 저장
    const result = {
      exploredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      pages,
    };

    await fs.writeFile(
      'reports/exploration/navigation-structure.json',
      JSON.stringify(result, null, 2)
    );
    console.log('\n📁 결과 저장: reports/exploration/navigation-structure.json');

    // 요약 출력
    console.log('\n' + '='.repeat(60));
    console.log('📊 탐색 결과 요약');
    console.log('='.repeat(60));

    for (const p of pages) {
      console.log(`\n📄 ${p.name}`);
      console.log(`   URL: ${p.url}`);
      console.log(`   제목: ${p.headings.slice(0, 3).join(', ') || '없음'}`);
      console.log(`   버튼: ${p.buttons.slice(0, 5).join(', ') || '없음'}`);
      console.log(`   폼 필드: ${p.forms.length}개`);
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await browser.close();
  }
}

async function analyzePage(page: import('playwright').Page, name: string): Promise<PageStructure> {
  const url = page.url();

  // 헤딩 수집
  const headings: string[] = [];
  const headingElements = await page.locator('h1, h2, h3, h4').all();
  for (const h of headingElements.slice(0, 10)) {
    try {
      const text = (await h.textContent())?.trim();
      if (text && text.length < 100) headings.push(text);
    } catch {}
  }

  // 버튼 수집
  const buttons: string[] = [];
  const buttonElements = await page.locator('button').all();
  for (const btn of buttonElements.slice(0, 20)) {
    try {
      const text = (await btn.textContent())?.trim();
      if (text && text.length < 50 && !buttons.includes(text)) {
        buttons.push(text);
      }
    } catch {}
  }

  // 링크 수집
  const links: string[] = [];
  const linkElements = await page.locator('a[href]').all();
  for (const link of linkElements.slice(0, 20)) {
    try {
      const href = await link.getAttribute('href');
      const text = (await link.textContent())?.trim();
      if (href && !href.startsWith('http')) {
        links.push(`${href} (${text?.slice(0, 30) || 'no text'})`);
      }
    } catch {}
  }

  // 폼 필드 수집
  const forms: { name: string; type: string }[] = [];
  const inputElements = await page.locator('input, select, textarea').all();
  for (const input of inputElements.slice(0, 15)) {
    try {
      const name = await input.getAttribute('name') || await input.getAttribute('placeholder') || await input.getAttribute('id');
      const type = await input.getAttribute('type') || 'text';
      if (name) {
        forms.push({ name, type });
      }
    } catch {}
  }

  return { name, url, headings, buttons, links, forms };
}

main().catch(console.error);
