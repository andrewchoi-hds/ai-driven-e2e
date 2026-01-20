#!/usr/bin/env tsx
/**
 * 회원가입 전체 플로우 테스트 (실제 가입 포함)
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://qa.hirevisa.com';
const VERIFICATION_CODE = '000000'; // QA 서버 고정 인증 코드
const PASSWORD = 'qwer1234';

async function main() {
  console.log('\n🔍 회원가입 전체 플로우 테스트\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }
  });

  await fs.mkdir('reports/exploration/signup', { recursive: true });
  let stepNum = 0;

  const saveStep = async (name: string) => {
    stepNum++;
    await page.screenshot({
      path: `reports/exploration/signup/full-step${stepNum}-${name}.png`,
      fullPage: true
    });
    console.log(`📸 Step ${stepNum}: ${name} - ${page.url()}`);
  };

  try {
    // Step 1: 로그인 페이지 → Sign Up
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.waitForTimeout(2000);
    await saveStep('signup-page');

    // Step 2: 이메일 입력
    console.log('\n📍 이메일 입력...');
    await page.locator('#email').fill('flow-test@aaa.com');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'next' }).click();
    await page.waitForTimeout(3000);
    await saveStep('verification-page');

    // Step 3: 인증 코드 입력
    console.log('\n📍 인증 코드 입력 (000000)...');
    await page.locator('#verification-code').fill(VERIFICATION_CODE);
    await page.waitForTimeout(2000);
    await saveStep('code-entered');

    // Step 4: Verification completed 클릭
    console.log('\n📍 Verification completed 클릭...');
    await page.getByRole('button', { name: 'Verification completed' }).click();
    await page.waitForTimeout(3000);
    await saveStep('after-verification');

    // 현재 페이지 분석
    console.log(`\n📍 현재 URL: ${page.url()}`);
    const inputs = await page.locator('input:visible').all();
    console.log(`   입력 필드 ${inputs.length}개:`);
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      console.log(`   - ${type}: id="${id}" placeholder="${placeholder}"`);
    }

    // Step 5: 비밀번호 입력 (있다면)
    const passwordInputs = await page.locator('input[type="password"]').all();
    if (passwordInputs.length > 0) {
      console.log('\n📍 비밀번호 입력...');
      for (const input of passwordInputs) {
        await input.fill(PASSWORD);
      }
      await page.waitForTimeout(1000);
      await saveStep('password-entered');

      // next 버튼 클릭
      const nextBtn = page.getByRole('button', { name: 'next' });
      if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(3000);
        await saveStep('after-password');
      }
    }

    // Step 6: 약관 동의 (있다면)
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    if (checkboxes.length > 0) {
      console.log(`\n📍 약관 동의 (${checkboxes.length}개)...`);
      for (const cb of checkboxes) {
        try {
          await cb.check({ force: true });
        } catch {}
      }
      await page.waitForTimeout(1000);
      await saveStep('terms-agreed');

      // 최종 제출 버튼
      const submitBtn = page.getByRole('button', { name: 'Sign Up' });
      if (await submitBtn.count() > 0) {
        console.log('\n📍 Sign Up 버튼 발견 - 클릭하지 않음 (탐색 모드)');
        await saveStep('ready-to-submit');
      }
    }

    // 최종 상태
    console.log(`\n📍 최종 URL: ${page.url()}`);
    await saveStep('final');

    console.log('\n✅ 플로우 탐색 완료!');

  } catch (error) {
    console.error('❌ 오류:', error);
    await page.screenshot({ path: 'reports/exploration/signup/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
