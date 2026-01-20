#!/usr/bin/env tsx
/**
 * 회원가입 전체 플로우 탐색
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://qa.hirevisa.com';

async function main() {
  console.log('\n🔍 회원가입 플로우 탐색\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }
  });

  await fs.mkdir('reports/exploration/signup', { recursive: true });
  let stepNum = 0;

  const saveStep = async (name: string) => {
    stepNum++;
    await page.screenshot({
      path: `reports/exploration/signup/step${stepNum}-${name}.png`,
      fullPage: true
    });
    console.log(`📸 Step ${stepNum}: ${name} - ${page.url()}`);
  };

  const analyzeForm = async () => {
    const inputs = await page.locator('input:visible').all();
    console.log(`\n   입력 필드:`);
    for (const input of inputs) {
      try {
        const id = await input.getAttribute('id');
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`   - ${type || 'text'}: id="${id}" placeholder="${placeholder}"`);
      } catch {}
    }

    const buttons = await page.locator('button:visible').all();
    console.log(`   버튼:`);
    for (const btn of buttons) {
      try {
        const text = (await btn.textContent())?.trim();
        const disabled = await btn.isDisabled();
        if (text) console.log(`   - "${text}" ${disabled ? '(비활성)' : '(활성)'}`);
      } catch {}
    }

    const checkboxes = await page.locator('input[type="checkbox"]:visible').all();
    if (checkboxes.length > 0) {
      console.log(`   체크박스: ${checkboxes.length}개`);
    }
  };

  try {
    // Step 1: 로그인 페이지
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);
    await saveStep('login-page');

    // Step 2: Sign Up 버튼 클릭
    console.log('\n📍 Sign Up 버튼 클릭...');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.waitForTimeout(2000);
    await saveStep('signup-email');
    await analyzeForm();

    // Step 3: 이메일 입력
    console.log('\n📍 이메일 입력...');
    await page.locator('#email').fill('explore-test@aaa.com');
    await page.waitForTimeout(500);

    // next 버튼 클릭
    const nextBtn1 = page.getByRole('button', { name: 'next' });
    await nextBtn1.click();
    await page.waitForTimeout(3000);
    await saveStep('after-email');
    await analyzeForm();

    // Step 4: 인증 코드 입력 (있다면)
    console.log('\n📍 인증 코드 페이지 확인...');
    const currentUrl1 = page.url();
    if (currentUrl1.includes('verify') || currentUrl1.includes('code')) {
      console.log('   ✅ 인증 코드 페이지');
    }

    // 인증 코드 입력 필드 찾기 (6자리 입력 필드)
    const codeInputs = await page.locator('input[type="text"], input[type="number"], input[type="tel"]').all();
    if (codeInputs.length > 0) {
      console.log(`   인증 코드 입력 필드 ${codeInputs.length}개 발견`);

      // 6자리 코드를 각 필드에 입력하거나 하나의 필드에 입력
      if (codeInputs.length === 6) {
        // 6개의 개별 입력 필드
        const code = '000000';
        for (let i = 0; i < 6; i++) {
          await codeInputs[i].fill(code[i]);
        }
      } else if (codeInputs.length >= 1) {
        // 하나의 입력 필드
        await codeInputs[0].fill('000000');
      }

      await page.waitForTimeout(1000);
      await saveStep('code-filled');

      // 확인/next 버튼 클릭
      const verifyBtn = page.locator('button:has-text("확인"), button:has-text("Verify"), button:has-text("next"), button:has-text("인증")').first();
      if (await verifyBtn.count() > 0 && await verifyBtn.isEnabled()) {
        await verifyBtn.click();
        await page.waitForTimeout(3000);
        await saveStep('after-verify');
        await analyzeForm();
      }
    }

    // Step 5: 비밀번호 설정 페이지
    console.log('\n📍 비밀번호 설정 페이지 확인...');
    const passwordInputs = await page.locator('input[type="password"]').all();
    if (passwordInputs.length > 0) {
      console.log(`   ✅ 비밀번호 입력 필드 ${passwordInputs.length}개 발견`);

      // 비밀번호 입력
      if (passwordInputs.length >= 1) {
        await passwordInputs[0].fill('qwer1234');
      }
      if (passwordInputs.length >= 2) {
        await passwordInputs[1].fill('qwer1234');
      }

      await page.waitForTimeout(1000);
      await saveStep('password-filled');

      // next/완료 버튼 클릭
      const pwdNextBtn = page.locator('button:has-text("next"), button:has-text("완료"), button:has-text("확인")').first();
      if (await pwdNextBtn.count() > 0 && await pwdNextBtn.isEnabled()) {
        await pwdNextBtn.click();
        await page.waitForTimeout(3000);
        await saveStep('after-password');
        await analyzeForm();
      }
    }

    // Step 6: 약관 동의 페이지
    console.log('\n📍 약관 동의 페이지 확인...');
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    if (checkboxes.length > 0) {
      console.log(`   ✅ 체크박스 ${checkboxes.length}개 발견`);

      // 전체 동의 또는 개별 동의
      for (const cb of checkboxes) {
        try {
          if (!(await cb.isChecked())) {
            await cb.check({ force: true });
          }
        } catch {}
      }

      await page.waitForTimeout(1000);
      await saveStep('terms-agreed');

      // 완료/가입 버튼 클릭
      const submitBtn = page.locator('button:has-text("가입"), button:has-text("완료"), button:has-text("Sign Up"), button:has-text("next")').first();
      if (await submitBtn.count() > 0 && await submitBtn.isEnabled()) {
        console.log('   ✅ 제출 버튼 활성화됨');
        // 실제 제출은 하지 않음 (탐색 목적)
        await saveStep('ready-to-submit');
      }
    }

    // 최종 URL 확인
    console.log(`\n📍 최종 URL: ${page.url()}`);
    await saveStep('final');

    console.log('\n✅ 플로우 탐색 완료!');
    console.log(`📁 스크린샷: reports/exploration/signup/step*.png (${stepNum}개)`);

  } catch (error) {
    console.error('❌ 오류:', error);
    await page.screenshot({ path: 'reports/exploration/signup/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
