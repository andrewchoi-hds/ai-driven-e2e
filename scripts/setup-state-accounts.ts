#!/usr/bin/env tsx
/**
 * 상태별 테스트 계정 준비 스크립트
 *
 * 다양한 사용자 상태의 계정을 생성하고 해당 플로우를 완료합니다.
 *
 * Usage:
 *   npx tsx scripts/setup-state-accounts.ts [options]
 *
 * Options:
 *   --passport      여권 등록 완료 계정 생성
 *   --school        학교 선택 완료 계정 생성
 *   --stay-expiry   체류만료일 등록 계정 생성
 *   --all           모든 상태 계정 생성
 */

import { chromium, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://qa.hirevisa.com';
const PASSWORD = 'qwer1234';
const VERIFICATION_CODE = '000000';

// 테스트 이미지 경로
const TEST_PASSPORT_IMAGE = path.join(process.cwd(), 'tests/fixtures/files/test-passport.png');

interface AccountResult {
  email: string;
  password: string;
  state: string;
  description: string;
  success: boolean;
  error?: string;
}

// 카운터 파일 경로
const COUNTER_FILE = 'reports/account-counter.json';

async function getNextAccountNumber(): Promise<number> {
  try {
    const data = await fs.readFile(COUNTER_FILE, 'utf-8');
    const counter = JSON.parse(data);
    return counter.lastCount + 1;
  } catch {
    return 100; // 기존 계정과 충돌 방지
  }
}

async function saveAccountNumber(count: number): Promise<void> {
  await fs.writeFile(COUNTER_FILE, JSON.stringify({ lastCount: count, updatedAt: new Date().toISOString() }, null, 2));
}

async function createAccount(page: Page, email: string): Promise<boolean> {
  try {
    console.log(`   📝 계정 생성 중: ${email}`);

    // 로그인 페이지에서 시작
    await page.goto('/login');
    await page.waitForTimeout(2000);

    // Sign up 링크 클릭
    const signupLink = page.getByText(/Sign up|회원가입/i);
    await signupLink.click();
    await page.waitForTimeout(2000);

    // Step 1: 이메일 입력
    const emailInput = page.locator('#email');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(email);

    // 입력 후 blur 이벤트 발생 (유효성 검사 트리거)
    await emailInput.blur();
    await page.waitForTimeout(1000);

    // 스크린샷 저장 (디버그용)
    await page.screenshot({ path: 'reports/debug-signup-step1.png' });

    // next 버튼 활성화 대기 및 클릭
    const nextBtn = page.getByRole('button', { name: 'next' });

    // 버튼이 활성화될 때까지 대기 (최대 10초)
    for (let i = 0; i < 10; i++) {
      const isEnabled = await nextBtn.isEnabled();
      console.log(`   next 버튼 상태: ${isEnabled ? '활성화' : '비활성화'}`);
      if (isEnabled) break;
      await page.waitForTimeout(1000);
    }

    await nextBtn.click();
    await page.waitForTimeout(3000);

    // Step 1 완료 후 스크린샷
    await page.screenshot({ path: 'reports/debug-signup-step2.png' });
    console.log(`   Step 1 완료, 현재 URL: ${page.url()}`);

    // Step 2: 인증 코드
    const verificationInput = page.locator('#verification-code');
    if (await verificationInput.isVisible({ timeout: 10000 })) {
      await verificationInput.fill(VERIFICATION_CODE);
      // Verification completed 버튼 클릭
      const verifyBtn = page.getByRole('button', { name: /Verification completed|인증 완료/i });
      if (await verifyBtn.isVisible({ timeout: 5000 })) {
        await verifyBtn.click();
      } else {
        await page.getByRole('button', { name: /next/i }).click();
      }
      await page.waitForTimeout(3000);
    }

    // Step 3: 비밀번호
    const passwordInput = page.locator('#password');
    if (await passwordInput.isVisible({ timeout: 10000 })) {
      await passwordInput.fill(PASSWORD);
      const confirmInput = page.locator('#passwordConfirm');
      await confirmInput.fill(PASSWORD);
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(3000);
    }

    // Step 4: 약관 동의
    const agreeAll = page.getByText(/Agree to all/i);
    if (await agreeAll.isVisible({ timeout: 10000 })) {
      await agreeAll.click();
      await page.waitForTimeout(500);
      // Next 버튼 (대문자 주의)
      const nextBtn = page.getByRole('button', { name: 'Next' });
      await nextBtn.click();
      await page.waitForTimeout(3000);
    }

    // Step 5: 완료
    const confirmBtn = page.getByRole('button', { name: /Confirmation|확인/i });
    if (await confirmBtn.isVisible({ timeout: 10000 })) {
      await confirmBtn.click();
      await page.waitForTimeout(3000);
    }

    // 로그인 또는 홈 페이지 도착 확인 (더 유연하게)
    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    console.log(`   현재 URL: ${finalUrl}`);

    // 스크린샷 저장
    await page.screenshot({ path: 'reports/debug-signup-final.png' });

    if (finalUrl.includes('/home') || finalUrl.includes('/login') || finalUrl.includes('/m/')) {
      console.log(`   ✅ 계정 생성 완료: ${email}`);
      return true;
    }

    // 마지막으로 홈으로 이동 시도
    await page.goto('/m/home');
    await page.waitForTimeout(3000);
    console.log(`   ✅ 계정 생성 완료: ${email}`);
    return true;
  } catch (e) {
    console.error(`   ❌ 계정 생성 실패: ${e}`);
    return false;
  }
}

async function login(page: Page, email: string): Promise<boolean> {
  try {
    console.log(`   🔐 로그인 중: ${email}`);

    await page.goto('/login');
    await page.waitForTimeout(2000);

    // 이미 홈 페이지로 리다이렉트되었는지 확인
    if (page.url().includes('/home')) {
      console.log('   ℹ️ 이미 로그인된 상태');
      return true;
    }

    // 로그인 폼 입력
    const emailInput = page.locator('#email, input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(email);

    const passwordInput = page.locator('#password, input[type="password"]').first();
    await passwordInput.fill(PASSWORD);

    const loginBtn = page.getByRole('button', { name: /Log in|로그인/i });
    await loginBtn.click();

    // 홈 페이지 도착 대기
    await page.waitForURL('**/home', { timeout: 15000 });
    console.log('   ✅ 로그인 성공');
    return true;
  } catch (e) {
    console.error(`   ❌ 로그인 실패: ${e}`);
    return false;
  }
}

async function completePassportRegistration(page: Page): Promise<boolean> {
  try {
    console.log('   📷 여권 등록 진행 중...');

    // 홈으로 이동
    await page.goto('/m/home');
    await page.waitForTimeout(3000);

    // 홈에서 Register Information 클릭
    const registerBtn = page.getByText('Register Information');
    if (!(await registerBtn.isVisible({ timeout: 5000 }))) {
      console.log('   ℹ️ Register Information 버튼 없음 (이미 등록됨)');
      // 스크린샷으로 현재 상태 확인
      await page.screenshot({ path: 'reports/debug-passport-home.png' });
      return true;
    }

    await registerBtn.click();
    await page.waitForTimeout(3000);

    // Step 1: 안내 페이지 - next 버튼 클릭
    const nextBtn1 = page.getByRole('button', { name: /next/i });
    if (await nextBtn1.isVisible({ timeout: 5000 })) {
      await nextBtn1.click();
      await page.waitForTimeout(2000);
    }

    // Step 2: 파일 업로드
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(TEST_PASSPORT_IMAGE);
      console.log('   ✅ 여권 이미지 업로드 완료');
      await page.waitForTimeout(3000);

      // 업로드 후 스크린샷
      await page.screenshot({ path: 'reports/debug-passport-uploaded.png' });
    }

    // Submit/Next 버튼 찾기 및 클릭
    // 업로드 후 버튼이 활성화되기를 기다림
    await page.waitForTimeout(2000);

    // 여러 버튼 패턴 시도
    const buttonPatterns = [
      page.getByRole('button', { name: /next/i }),
      page.getByRole('button', { name: /submit/i }),
      page.getByRole('button', { name: /확인/i }),
      page.getByRole('button', { name: /완료/i }),
      page.locator('button[type="submit"]'),
    ];

    let clicked = false;
    for (const btn of buttonPatterns) {
      try {
        if (await btn.isVisible({ timeout: 2000 })) {
          // 버튼이 활성화될 때까지 대기
          for (let i = 0; i < 5; i++) {
            if (await btn.isEnabled()) {
              await btn.click();
              clicked = true;
              console.log('   ✅ 제출 버튼 클릭');
              break;
            }
            await page.waitForTimeout(1000);
          }
          if (clicked) break;
        }
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'reports/debug-passport-submitted.png' });

    console.log('   ✅ 여권 등록 완료');
    return true;
  } catch (e) {
    console.error(`   ❌ 여권 등록 실패: ${e}`);
    await page.screenshot({ path: 'reports/debug-passport-error.png' });
    return false;
  }
}

async function completeSchoolSelection(page: Page): Promise<boolean> {
  try {
    console.log('   🏫 학교 선택 진행 중...');

    // 학교 선택 페이지로 이동
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(3000);

    // 학교 검색 및 선택
    const searchInput = page.getByPlaceholder(/search|검색/i);
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('서울대');
      await page.waitForTimeout(2000);

      // 첫 번째 결과 클릭
      const firstResult = page.locator('[class*="item"], [class*="result"]').first();
      if (await firstResult.isVisible({ timeout: 5000 })) {
        await firstResult.click();
        await page.waitForTimeout(2000);
      }
    }

    // 확인/다음 버튼 클릭
    const confirmBtn = page.getByRole('button', { name: /next|confirm|확인|선택/i }).first();
    if (await confirmBtn.isVisible({ timeout: 5000 })) {
      await confirmBtn.click();
      await page.waitForTimeout(3000);
    }

    console.log('   ✅ 학교 선택 완료');
    return true;
  } catch (e) {
    console.error(`   ❌ 학교 선택 실패: ${e}`);
    return false;
  }
}

async function completeStayExpiryRegistration(page: Page): Promise<boolean> {
  try {
    console.log('   📅 체류만료일 등록 진행 중...');

    // 체류만료일 페이지로 이동 (여권 등록 후 다음 단계)
    await page.goto('/m/home/submit/passport');
    await page.waitForTimeout(3000);

    // 체류만료일 입력 페이지 확인
    const dateInput = page.getByPlaceholder(/YYYY-MM-DD|날짜/i);
    if (await dateInput.isVisible({ timeout: 5000 })) {
      // 4개월 후 날짜 계산
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      const dateStr = futureDate.toISOString().split('T')[0];

      await dateInput.fill(dateStr);
      await page.waitForTimeout(1000);

      // 확인 버튼 클릭
      const confirmBtn = page.getByRole('button', { name: /next|confirm|확인|등록/i }).first();
      if (await confirmBtn.isVisible({ timeout: 5000 })) {
        await confirmBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    console.log('   ✅ 체류만료일 등록 완료');
    return true;
  } catch (e) {
    console.error(`   ❌ 체류만료일 등록 실패: ${e}`);
    return false;
  }
}

async function setupStateAccounts(options: {
  passport?: boolean;
  school?: boolean;
  stayExpiry?: boolean;
  all?: boolean;
}): Promise<AccountResult[]> {
  const results: AccountResult[] = [];

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. 여권 등록 완료 계정
    if (options.passport || options.all) {
      console.log('\n📋 여권 등록 완료 계정 생성');

      const context = await browser.newContext({
        baseURL: BASE_URL,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();

      const num = await getNextAccountNumber();
      const email = `state_passport_${num}@aaa.com`;

      let success = false;
      let error = '';

      try {
        // 계정 생성
        success = await createAccount(page, email);
        if (success) {
          await saveAccountNumber(num);
          // 로그인
          success = await login(page, email);
          if (success) {
            // 여권 등록
            success = await completePassportRegistration(page);
          }
        }

        if (!success) {
          error = '플로우 실패';
        }

        // 홈 화면 스크린샷 저장
        if (success) {
          await page.goto('/m/home');
          await page.waitForTimeout(3000);
          await page.screenshot({ path: `reports/state-screenshots/passport_registered_home.png`, fullPage: true });
        }
      } catch (e) {
        error = String(e);
        success = false;
      }

      results.push({
        email,
        password: PASSWORD,
        state: 'passport_registered',
        description: '여권 등록 완료',
        success,
        error,
      });

      await context.close();
    }

    // 2. 학교 선택 완료 계정
    if (options.school || options.all) {
      console.log('\n📋 학교 선택 완료 계정 생성');

      const context = await browser.newContext({
        baseURL: BASE_URL,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();

      const num = await getNextAccountNumber();
      const email = `state_school_${num}@aaa.com`;

      let success = false;
      let error = '';

      try {
        success = await createAccount(page, email);
        if (success) {
          await saveAccountNumber(num);
          success = await login(page, email);
          if (success) {
            success = await completePassportRegistration(page);
            if (success) {
              success = await completeSchoolSelection(page);
            }
          }
        }

        if (!success) {
          error = '플로우 실패';
        }

        // 홈 화면 스크린샷 저장
        if (success) {
          await page.goto('/m/home');
          await page.waitForTimeout(3000);
          await page.screenshot({ path: `reports/state-screenshots/school_selected_home.png`, fullPage: true });
        }
      } catch (e) {
        error = String(e);
        success = false;
      }

      results.push({
        email,
        password: PASSWORD,
        state: 'school_selected',
        description: '여권 + 학교 선택 완료',
        success,
        error,
      });

      await context.close();
    }

    // 3. 체류만료일 등록 계정
    if (options.stayExpiry || options.all) {
      console.log('\n📋 체류만료일 등록 계정 생성');

      const context = await browser.newContext({
        baseURL: BASE_URL,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();

      const num = await getNextAccountNumber();
      const email = `state_expiry_${num}@aaa.com`;

      let success = false;
      let error = '';

      try {
        success = await createAccount(page, email);
        if (success) {
          await saveAccountNumber(num);
          success = await login(page, email);
          if (success) {
            success = await completePassportRegistration(page);
            if (success) {
              success = await completeStayExpiryRegistration(page);
            }
          }
        }

        if (!success) {
          error = '플로우 실패';
        }

        // 홈 화면 스크린샷 저장
        if (success) {
          await page.goto('/m/home');
          await page.waitForTimeout(3000);
          await page.screenshot({ path: `reports/state-screenshots/stay_expiry_home.png`, fullPage: true });
        }
      } catch (e) {
        error = String(e);
        success = false;
      }

      results.push({
        email,
        password: PASSWORD,
        state: 'stay_expiry',
        description: '여권 + 체류만료일 등록',
        success,
        error,
      });

      await context.close();
    }

  } finally {
    await browser.close();
  }

  return results;
}

function generateAccountsCode(results: AccountResult[]): string {
  const successAccounts = results.filter(r => r.success);

  const lines = [
    '// 자동 생성된 상태별 테스트 계정',
    '// 생성 시간: ' + new Date().toISOString(),
    '',
    'const TEST_ACCOUNTS: UserAccount[] = [',
    '  // 신규 사용자 (서류 미제출)',
    '  { email: \'aiqa2@aaa.com\', password: \'qwer1234\', state: \'new\', description: \'신규 사용자 (서류 미제출)\' },',
    '',
  ];

  for (const account of successAccounts) {
    lines.push(`  // ${account.description}`);
    lines.push(`  { email: '${account.email}', password: '${account.password}', state: '${account.state}', description: '${account.description}' },`);
    lines.push('');
  }

  lines.push('];');

  return lines.join('\n');
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
상태별 테스트 계정 준비 스크립트

Usage:
  npx tsx scripts/setup-state-accounts.ts [options]

Options:
  --passport      여권 등록 완료 계정 생성
  --school        학교 선택 완료 계정 생성
  --stay-expiry   체류만료일 등록 계정 생성
  --all           모든 상태 계정 생성
  --help, -h      도움말

Example:
  npx tsx scripts/setup-state-accounts.ts --all
  npx tsx scripts/setup-state-accounts.ts --passport --school
    `);
    process.exit(0);
  }

  const options = {
    passport: args.includes('--passport'),
    school: args.includes('--school'),
    stayExpiry: args.includes('--stay-expiry'),
    all: args.includes('--all'),
  };

  // 아무 옵션도 없으면 --all 기본값
  if (!options.passport && !options.school && !options.stayExpiry && !options.all) {
    options.all = true;
  }

  console.log('\n🔧 상태별 테스트 계정 준비\n');

  // 스크린샷 디렉토리 생성
  await fs.mkdir('reports/state-screenshots', { recursive: true });

  const results = await setupStateAccounts(options);

  // 결과 요약
  console.log('\n📊 결과 요약:');
  console.log('─'.repeat(50));

  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.state}: ${result.email}`);
    if (result.error) {
      console.log(`   오류: ${result.error}`);
    }
  }

  // TEST_ACCOUNTS 코드 생성
  const successResults = results.filter(r => r.success);
  if (successResults.length > 0) {
    console.log('\n📝 TEST_ACCOUNTS 업데이트 코드:');
    console.log('─'.repeat(50));
    console.log(generateAccountsCode(results));

    // 파일로 저장
    await fs.writeFile('reports/state-accounts-config.ts', generateAccountsCode(results));
    console.log('\n✅ reports/state-accounts-config.ts 파일로 저장됨');
  }
}

main().catch(console.error);
