#!/usr/bin/env tsx
/**
 * 테스트 계정 생성 스크립트
 *
 * aiqa1@aaa.com ~ aiqa6@aaa.com 형태로 6개 계정 생성
 * - 인증 코드: 000000 (QA 서버 고정값)
 * - 비밀번호: qwer1234
 */

import { chromium, Page, Locator } from 'playwright';
import fs from 'fs/promises';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://qa.hirevisa.com';
const VERIFICATION_CODE = '000000';
const PASSWORD = 'qwer1234';
const EMAIL_PREFIX = 'aiqa';
const EMAIL_DOMAIN = '@aaa.com';
const MAX_ACCOUNTS = 6;

interface AccountResult {
  email: string;
  password: string;
  status: 'created' | 'duplicate' | 'failed';
  error?: string;
}

/**
 * 버튼 찾기 헬퍼 - 영어/한국어 버튼 모두 지원
 */
async function findButton(page: Page, englishName: string, koreanName: string): Promise<Locator> {
  // 영어 버튼 먼저 시도
  let btn = page.getByRole('button', { name: englishName });
  if (await btn.count() > 0) return btn;

  // 한국어 버튼 시도
  btn = page.getByRole('button', { name: koreanName });
  if (await btn.count() > 0) return btn;

  // 텍스트로 찾기
  btn = page.locator(`button:has-text("${englishName}"), button:has-text("${koreanName}")`).first();
  return btn;
}

async function createAccount(page: Page, email: string): Promise<AccountResult> {
  const result: AccountResult = {
    email,
    password: PASSWORD,
    status: 'failed',
  };

  try {
    // Step 1: 로그인 페이지 → Sign Up / 회원가입
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1500);

    const signupBtn = await findButton(page, 'Sign Up', '회원가입');
    await signupBtn.click();
    await page.waitForURL('**/signup');
    await page.waitForTimeout(1000);

    // Step 2: 이메일 입력
    console.log(`   📧 이메일 입력: ${email}`);
    const emailInput = page.locator('#email');
    await emailInput.click();
    await emailInput.clear();
    await emailInput.pressSequentially(email, { delay: 50 });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1500);

    // 디버깅 스크린샷
    await page.screenshot({
      path: `reports/accounts/debug-${email.replace('@', '-at-')}.png`,
      fullPage: true
    });

    // 임시 에러 메시지 확인 및 처리
    const tempError = page.getByText(/temporary error|일시적 오류/i);
    if (await tempError.count() > 0) {
      console.log(`   ⚠️  임시 에러 발생 - 페이지 새로고침 후 재시도`);
      await page.reload();
      await page.waitForTimeout(2000);
      // 이메일 다시 입력
      const emailInput2 = page.locator('#email');
      await emailInput2.click();
      await emailInput2.pressSequentially(email, { delay: 50 });
      await page.keyboard.press('Tab');
      await page.waitForTimeout(2000);
    }

    // next/다음 버튼 찾기
    const nextBtn1 = await findButton(page, 'next', '다음');
    await nextBtn1.waitFor({ state: 'visible', timeout: 5000 });

    // 버튼 색상으로 판단 (aria-disabled 무시하고 강제 클릭 시도)
    console.log(`   ➡️  next 버튼 클릭 (force)`);
    await nextBtn1.click({ force: true });
    await page.waitForTimeout(3000);

    // 클릭 후 에러 메시지 확인
    if (await tempError.count() > 0) {
      console.log(`   ⚠️  서버 에러 발생 - 잠시 대기 후 계속`);
      await page.waitForTimeout(5000);
    }

    // 이메일 중복 체크
    const duplicateError = page.getByText(/already|duplicate|exist|이미|중복|registered/i);
    if (await duplicateError.count() > 0) {
      console.log(`   ⚠️  이미 등록된 이메일`);
      result.status = 'duplicate';
      return result;
    }

    // Step 3: 인증 코드 입력
    const codeInput = page.locator('#verification-code');
    if (await codeInput.count() > 0) {
      console.log(`   🔐 인증 코드 입력: ${VERIFICATION_CODE}`);
      await codeInput.fill(VERIFICATION_CODE);
      await page.waitForTimeout(1500);

      // Verification completed / 인증 완료 버튼
      const verifyBtn = await findButton(page, 'Verification completed', '인증 완료');
      await verifyBtn.click();
      await page.waitForTimeout(2000);
    }

    // Step 4: 비밀번호 설정
    const passwordInput = page.locator('#password');
    if (await passwordInput.count() > 0) {
      console.log(`   🔑 비밀번호 설정: ${PASSWORD}`);
      await passwordInput.fill(PASSWORD);
      await page.locator('#passwordConfirm').fill(PASSWORD);
      await page.waitForTimeout(500);

      const nextBtn2 = await findButton(page, 'next', '다음');
      await nextBtn2.click();
      await page.waitForTimeout(2000);
    }

    // Step 5: 약관 동의
    const agreeAllEn = page.getByText('Agree to all terms and conditions');
    const agreeAllKo = page.getByText('모든 약관에 동의');
    let agreeAll = agreeAllEn;
    if (await agreeAllKo.count() > 0) agreeAll = agreeAllKo;

    if (await agreeAll.count() > 0) {
      console.log(`   ✅ 약관 전체 동의`);
      await agreeAll.click();
      await page.waitForTimeout(1000);

      // 최종 제출 - Next / 다음 / Sign Up / 가입하기
      const submitBtn = await findButton(page, 'Next', '다음');
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }

    // Step 6: Sign-up Completed 확인 및 Confirmation 클릭
    const signupCompleted = page.getByText('Sign-up Completed');
    const confirmBtn = await findButton(page, 'Confirmation', '확인');

    if (await signupCompleted.count() > 0 || await confirmBtn.count() > 0) {
      console.log(`   🎉 가입 완료 화면 - Confirmation 클릭`);
      await confirmBtn.click();
      await page.waitForTimeout(3000);
    }

    // 가입 완료 확인
    const currentUrl = page.url();
    if (currentUrl.includes('/home') || currentUrl.includes('/login') || await signupCompleted.count() > 0) {
      console.log(`   ✅ 가입 완료!`);
      result.status = 'created';
    } else {
      await page.screenshot({
        path: `reports/accounts/error-${email.replace('@', '-')}.png`,
        fullPage: true
      });
      result.error = `Unexpected URL after signup: ${currentUrl}`;
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ 오류: ${result.error}`);

    try {
      await page.screenshot({
        path: `reports/accounts/error-${email.replace('@', '-')}.png`,
        fullPage: true
      });
    } catch {}
  }

  return result;
}

async function main() {
  console.log('\n🚀 테스트 계정 생성 시작\n');
  console.log(`📋 설정:`);
  console.log(`   - 이메일 형식: ${EMAIL_PREFIX}N${EMAIL_DOMAIN}`);
  console.log(`   - 비밀번호: ${PASSWORD}`);
  console.log(`   - 인증 코드: ${VERIFICATION_CODE}`);
  console.log(`   - 최대 계정 수: ${MAX_ACCOUNTS}\n`);

  await fs.mkdir('reports/accounts', { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results: AccountResult[] = [];
  let createdCount = 0;

  try {
    for (let i = 1; i <= MAX_ACCOUNTS && createdCount < MAX_ACCOUNTS; i++) {
      const email = `${EMAIL_PREFIX}${i}${EMAIL_DOMAIN}`;
      console.log(`\n[${i}/${MAX_ACCOUNTS}] ${email} 생성 시도...`);

      const context = await browser.newContext({
        viewport: { width: 390, height: 844 }
      });
      const page = await context.newPage();

      const result = await createAccount(page, email);
      results.push(result);

      if (result.status === 'created') {
        createdCount++;
      }

      await context.close();

      if (i < MAX_ACCOUNTS) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

  } finally {
    await browser.close();
  }

  // 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 결과 요약');
  console.log('='.repeat(60));

  const created = results.filter(r => r.status === 'created');
  const duplicates = results.filter(r => r.status === 'duplicate');
  const failed = results.filter(r => r.status === 'failed');

  console.log(`\n✅ 생성 완료: ${created.length}개`);
  created.forEach(r => console.log(`   - ${r.email}`));

  if (duplicates.length > 0) {
    console.log(`\n⚠️  이미 존재: ${duplicates.length}개`);
    duplicates.forEach(r => console.log(`   - ${r.email}`));
  }

  if (failed.length > 0) {
    console.log(`\n❌ 실패: ${failed.length}개`);
    failed.forEach(r => console.log(`   - ${r.email}: ${r.error}`));
  }

  // 결과 파일 저장
  const report = {
    generatedAt: new Date().toISOString(),
    config: {
      emailPrefix: EMAIL_PREFIX,
      emailDomain: EMAIL_DOMAIN,
      password: PASSWORD,
      verificationCode: VERIFICATION_CODE,
    },
    summary: {
      total: results.length,
      created: created.length,
      duplicate: duplicates.length,
      failed: failed.length,
    },
    accounts: results,
  };

  await fs.writeFile(
    'reports/accounts/creation-report.json',
    JSON.stringify(report, null, 2)
  );
  console.log(`\n📁 결과 저장: reports/accounts/creation-report.json`);

  // fixture 파일에 추가할 형식으로 출력
  if (created.length > 0) {
    console.log('\n📝 test-users.ts에 추가할 코드:');
    console.log('---');
    for (let i = 0; i < created.length; i++) {
      const account = created[i];
      console.log(`  aiqa${i + 1}: {
    email: '${account.email}',
    password: '${account.password}',
    state: 'new',
    description: 'AI QA 테스트 계정 ${i + 1}',
  },`);
    }
    console.log('---');
  }
}

main().catch(console.error);
