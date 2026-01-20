#!/usr/bin/env tsx
/**
 * 회원가입 페이지 탐색 - 회원가입 플로우를 파악합니다.
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://qa.hirevisa.com';

async function main() {
  console.log('\n🔍 회원가입 페이지 탐색\n');

  const browser = await chromium.launch({ headless: false }); // 화면 확인을 위해 headless: false
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }
  });

  await fs.mkdir('reports/exploration', { recursive: true });

  try {
    // 1. 로그인 페이지에서 회원가입 링크 찾기
    console.log('📍 로그인 페이지 접속...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);

    // 스크린샷
    await page.screenshot({ path: 'reports/exploration/login-page.png', fullPage: true });

    // 회원가입 링크 찾기
    const signupLink = page.getByText('회원가입').first();
    if (await signupLink.count() > 0) {
      console.log('✅ 회원가입 링크 발견');
      await signupLink.click();
      await page.waitForTimeout(2000);
    } else {
      // 다른 방법 시도
      const signUpLink = page.locator('a[href*="signup"], a[href*="register"], a:has-text("Sign up")').first();
      if (await signUpLink.count() > 0) {
        await signUpLink.click();
        await page.waitForTimeout(2000);
      }
    }

    console.log(`📍 현재 URL: ${page.url()}`);
    await page.screenshot({ path: 'reports/exploration/signup-step1.png', fullPage: true });

    // 2. 회원가입 페이지 분석
    console.log('\n📝 회원가입 페이지 요소 분석...\n');

    // 입력 필드 찾기
    const inputs = await page.locator('input').all();
    console.log(`입력 필드 (${inputs.length}개):`);
    for (const input of inputs) {
      try {
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`   - id="${id}" name="${name}" type="${type}" placeholder="${placeholder}"`);
      } catch {}
    }

    // 버튼 찾기
    const buttons = await page.locator('button').all();
    console.log(`\n버튼 (${buttons.length}개):`);
    for (const btn of buttons) {
      try {
        const text = (await btn.textContent())?.trim();
        const disabled = await btn.isDisabled();
        console.log(`   - "${text}" ${disabled ? '(비활성)' : '(활성)'}`);
      } catch {}
    }

    // 체크박스 찾기
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`\n체크박스 (${checkboxes.length}개):`);
    for (const cb of checkboxes) {
      try {
        const id = await cb.getAttribute('id');
        const name = await cb.getAttribute('name');
        console.log(`   - id="${id}" name="${name}"`);
      } catch {}
    }

    // 링크 찾기
    const links = await page.locator('a').all();
    console.log(`\n링크 (${links.length}개):`);
    for (const link of links.slice(0, 10)) {
      try {
        const text = (await link.textContent())?.trim();
        const href = await link.getAttribute('href');
        if (text && text.length < 50) {
          console.log(`   - "${text}" -> ${href}`);
        }
      } catch {}
    }

    // 텍스트 내용 확인
    console.log('\n주요 텍스트:');
    const headings = await page.locator('h1, h2, h3, p').all();
    for (const h of headings.slice(0, 10)) {
      try {
        const text = (await h.textContent())?.trim();
        if (text && text.length > 5 && text.length < 100) {
          console.log(`   - "${text}"`);
        }
      } catch {}
    }

    // HTML 저장
    const html = await page.content();
    await fs.writeFile('reports/exploration/signup-page.html', html);
    console.log('\n📄 HTML 저장됨: reports/exploration/signup-page.html');

    // 3. 이메일 입력 후 다음 단계 확인
    console.log('\n📝 이메일 입력 테스트...');
    const emailInput = page.locator('#email, input[type="email"], input[name="email"]').first();
    if (await emailInput.count() > 0) {
      await emailInput.fill('test-explore@test.com');
      await page.waitForTimeout(1000);

      // 다음/인증 버튼 찾기
      const nextBtn = page.locator('button:has-text("다음"), button:has-text("인증"), button:has-text("확인"), button[type="submit"]').first();
      if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {
        console.log('✅ 다음 버튼 활성화됨');
        await page.screenshot({ path: 'reports/exploration/signup-email-filled.png', fullPage: true });
      }
    }

    console.log('\n✅ 탐색 완료!');
    console.log('📁 스크린샷: reports/exploration/signup-*.png');

    // 잠시 대기 (화면 확인용)
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
