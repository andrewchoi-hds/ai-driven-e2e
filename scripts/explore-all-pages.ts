#!/usr/bin/env tsx
/**
 * 모든 페이지 탐색 - force click으로 네비게이션 실행
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
  forms: { name: string; type: string; placeholder?: string }[];
  mainContent: string[];
}

async function main() {
  console.log('\n🔍 전체 페이지 탐색\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 } // iPhone viewport
  });

  const pages: PageStructure[] = [];
  await fs.mkdir('reports/exploration', { recursive: true });

  try {
    // 로그인
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);
    await page.locator('#email').fill('test21@aaaa.com');
    await page.locator('#password').fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForTimeout(3000);

    console.log(`✅ 로그인 완료: ${page.url()}\n`);

    // 홈 페이지 분석
    console.log('📱 홈 페이지 분석...');
    const homeStructure = await analyzePage(page, '홈');
    pages.push(homeStructure);
    await page.screenshot({ path: 'reports/exploration/page-home.png', fullPage: true });

    // 네비게이션 탭 클릭 - text selector와 force click 사용
    const navItems = [
      { name: '라이프', urlPart: 'life' },
      { name: '혜택', urlPart: 'benefit' },
      { name: '마이페이지', urlPart: 'mypage' },
    ];

    for (const nav of navItems) {
      try {
        console.log(`\n📱 ${nav.name} 페이지로 이동...`);

        // 텍스트가 포함된 요소를 찾아서 클릭
        const navElement = page.getByText(nav.name, { exact: true });

        if (await navElement.count() > 0) {
          await navElement.click({ force: true });
          await page.waitForTimeout(2000);

          const currentUrl = page.url();
          console.log(`   URL: ${currentUrl}`);

          // 페이지 구조 분석
          const structure = await analyzePage(page, nav.name);
          pages.push(structure);

          // 스크린샷 저장
          const safeName = nav.name.toLowerCase().replace(/\s+/g, '-');
          await page.screenshot({
            path: `reports/exploration/page-${safeName}.png`,
            fullPage: true
          });
          console.log(`   ✅ 스크린샷 저장: page-${safeName}.png`);
        } else {
          console.log(`   ❌ "${nav.name}" 버튼 찾을 수 없음`);
        }
      } catch (e) {
        console.log(`   ❌ 오류: ${(e as Error).message}`);
      }
    }

    // 홈으로 돌아가서 서브 페이지들 탐색
    console.log('\n📱 홈으로 돌아가서 서브 페이지 탐색...');
    await page.getByText('홈', { exact: true }).click({ force: true });
    await page.waitForTimeout(2000);

    // 주요 기능 버튼들 클릭 테스트
    const featureButtons = [
      { name: '정보 등록하기', expectedUrl: 'register' },
      { name: '통신', expectedUrl: 'telecom' },
      { name: '공항', expectedUrl: 'airport' },
      { name: '유심 무료 제공 요금제', expectedUrl: 'usim' },
    ];

    for (const feature of featureButtons) {
      try {
        const btn = page.getByText(feature.name, { exact: false }).first();
        if (await btn.count() > 0) {
          console.log(`\n   🔘 "${feature.name}" 클릭...`);
          await btn.click();
          await page.waitForTimeout(2000);

          const url = page.url();
          console.log(`      URL: ${url}`);

          // 새 페이지면 분석
          if (!pages.some(p => p.url === url)) {
            const structure = await analyzePage(page, feature.name);
            pages.push(structure);

            const safeName = feature.name.replace(/\s+/g, '-').slice(0, 20);
            await page.screenshot({
              path: `reports/exploration/page-${safeName}.png`,
              fullPage: true
            });
          }

          // 뒤로가기 또는 홈으로
          await page.goBack();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        // 무시하고 홈으로 돌아가기
        try {
          await page.goto(`${BASE_URL}/m/home`);
          await page.waitForTimeout(1000);
        } catch {}
      }
    }

    // 결과 저장
    const result = {
      exploredAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      totalPages: pages.length,
      pages,
    };

    await fs.writeFile(
      'reports/exploration/all-pages-structure.json',
      JSON.stringify(result, null, 2)
    );

    // 요약 출력
    console.log('\n' + '='.repeat(60));
    console.log('📊 탐색 결과 요약');
    console.log('='.repeat(60));

    for (const p of pages) {
      console.log(`\n📄 ${p.name}`);
      console.log(`   URL: ${p.url}`);
      console.log(`   제목: ${p.headings.slice(0, 3).join(' | ') || '없음'}`);
      console.log(`   버튼(${p.buttons.length}개): ${p.buttons.slice(0, 4).join(', ') || '없음'}`);
      console.log(`   폼 필드(${p.forms.length}개): ${p.forms.map(f => f.name).slice(0, 3).join(', ') || '없음'}`);
    }

    console.log(`\n📁 결과 저장: reports/exploration/all-pages-structure.json`);
    console.log(`📁 스크린샷: reports/exploration/page-*.png`);

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
      if (text && text.length < 100 && !headings.includes(text)) {
        headings.push(text);
      }
    } catch {}
  }

  // 버튼 수집
  const buttons: string[] = [];
  const buttonElements = await page.locator('button').all();
  for (const btn of buttonElements.slice(0, 25)) {
    try {
      const text = (await btn.textContent())?.trim();
      if (text && text.length < 50 && text.length > 0 && !buttons.includes(text)) {
        buttons.push(text);
      }
    } catch {}
  }

  // 폼 필드 수집
  const forms: { name: string; type: string; placeholder?: string }[] = [];
  const inputElements = await page.locator('input, select, textarea').all();
  for (const input of inputElements.slice(0, 20)) {
    try {
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      const type = await input.getAttribute('type') || 'text';
      const label = id || name || placeholder;
      if (label) {
        forms.push({ name: label, type, placeholder: placeholder || undefined });
      }
    } catch {}
  }

  // 주요 콘텐츠 텍스트
  const mainContent: string[] = [];
  const textElements = await page.locator('p, span, div').all();
  for (const el of textElements.slice(0, 30)) {
    try {
      const text = (await el.textContent())?.trim();
      if (text && text.length > 10 && text.length < 100 && !mainContent.includes(text)) {
        mainContent.push(text);
      }
    } catch {}
  }

  return { name, url, headings, buttons, forms, mainContent: mainContent.slice(0, 10) };
}

main().catch(console.error);
