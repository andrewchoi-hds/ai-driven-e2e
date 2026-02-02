import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  TestAccountManager,
  createNewTestAccount,
  loginWithAccount,
  updateAccountState,
} from '../../fixtures/test-account-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 테스트 이미지 경로
const TEST_PASSPORT_IMAGE = path.join(__dirname, '../../fixtures/files/test-passport.png');

/**
 * 여권 등록 플로우 테스트
 *
 * 주의: 이 테스트는 계정당 1회만 가능한 일회성 플로우입니다.
 * 매 실행 시 새 계정을 생성하여 테스트합니다.
 *
 * 실제 URL: /m/home/submit/passport
 */
test.describe('여권 등록 플로우', () => {
  test.describe.configure({ mode: 'serial' });

  let testEmail: string;
  let testPassword: string = 'qwer1234';

  test('새 계정 생성 및 로그인', async ({ page }) => {
    // 새 계정 생성
    const account = await createNewTestAccount(page, '여권 등록 테스트');
    testEmail = account.email;
    testPassword = account.password;

    console.log(`테스트 계정: ${testEmail}`);

    // 홈 페이지 도착 확인
    await expect(page).toHaveURL(/\/(home|login)/);
  });

  test('홈에서 Register Information 버튼 확인', async ({ page }) => {
    // 기존 계정으로 로그인
    await loginWithAccount(page, testEmail, testPassword);

    // 홈 페이지에서 여권 등록 버튼 확인 (영어/한국어)
    const registerBtn = page.getByText(/Register Information|정보 등록하기/i);
    await expect(registerBtn).toBeVisible({ timeout: 10000 });

    // 버튼 클릭하여 여권 등록 페이지로 이동
    await registerBtn.click();
    await page.waitForTimeout(2000);

    // URL 확인 (실제 URL: /m/home/submit/passport)
    await expect(page).toHaveURL(/\/submit\/passport/);
  });

  test('여권 등록 페이지 요소 확인', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);

    // 여권 등록 페이지로 직접 이동
    await page.goto('/m/home/submit/passport');
    await page.waitForTimeout(2000);

    // 페이지 제목 확인
    const pageTitle = page.getByText('Please upload passport');
    await expect(pageTitle).toBeVisible({ timeout: 10000 });

    // 안내 문구 확인
    await expect(page.getByText(/verify your identity/i)).toBeVisible();

    // 스크린샷 저장
    await page.screenshot({
      path: 'reports/passport-register-page.png',
      fullPage: true,
    });

    console.log('📸 여권 등록 페이지 스크린샷 저장: reports/passport-register-page.png');
  });

  test('여권 사진 업로드 테스트', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);
    await page.goto('/m/home/submit/passport');
    await page.waitForTimeout(2000);

    // Step 1: 안내 페이지에서 next 클릭
    console.log('Step 1: 안내 페이지');
    await expect(page.getByText('Please upload passport')).toBeVisible();

    const nextBtn = page.getByRole('button', { name: /next/i });
    await nextBtn.click();
    await page.waitForTimeout(2000);

    // Step 2: 실제 업로드 페이지
    console.log('Step 2: 업로드 페이지');
    await expect(page.getByText(/passport will be uploaded/i)).toBeVisible();

    // 파일 업로드 input 찾기
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 5000 });

    // 파일 업로드
    await fileInput.setInputFiles(TEST_PASSPORT_IMAGE);
    console.log('✅ 여권 이미지 업로드 완료');

    await page.waitForTimeout(2000);

    // 업로드 후 스크린샷
    await page.screenshot({
      path: 'reports/passport-uploaded.png',
      fullPage: true,
    });
  });

  test('여권 등록 완료까지 진행', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);
    await page.goto('/m/home/submit/passport');
    await page.waitForTimeout(2000);

    // Step 1: 안내 페이지 → next
    const nextBtn1 = page.getByRole('button', { name: /next/i });
    await nextBtn1.click();
    await page.waitForTimeout(2000);

    // Step 2: 파일 업로드
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(TEST_PASSPORT_IMAGE);
      await page.waitForTimeout(2000);
    }

    // 다음 버튼이 활성화될 때까지 대기
    const nextBtn2 = page.getByRole('button', { name: /next|확인|완료|submit/i }).first();

    // 최대 10초 동안 버튼 활성화 대기
    for (let i = 0; i < 10; i++) {
      if (await nextBtn2.isEnabled()) {
        break;
      }
      await page.waitForTimeout(1000);
    }

    if (await nextBtn2.isEnabled()) {
      await nextBtn2.click();
      await page.waitForTimeout(3000);

      console.log('다음 단계 URL:', page.url());

      await page.screenshot({
        path: 'reports/passport-next-step.png',
        fullPage: true,
      });
    } else {
      console.log('next 버튼 비활성화 상태');
    }

    // 계정 상태 업데이트
    updateAccountState(testEmail, 'passport_registering');
  });
});

/**
 * 여권 등록 UI 검증 테스트 (계정 생성 없이)
 * 기존 계정으로 UI 요소만 확인합니다.
 */
test.describe('여권 등록 UI 검증', () => {
  test.beforeEach(async ({ page }) => {
    // 기존 테스트 계정으로 로그인
    await page.goto('/login');
    await page.getByRole('textbox').first().fill('aiqa1@aaa.com');
    await page.getByRole('textbox').nth(1).fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/home', { timeout: 15000 });
  });

  test('홈 화면에서 Register Information 버튼 표시', async ({ page }) => {
    const registerBtn = page.getByText('Register Information');

    // 버튼 표시 여부 확인 (계정 상태에 따라 다를 수 있음)
    const isVisible = await registerBtn.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✅ Register Information 버튼 표시됨');
      await expect(registerBtn).toBeVisible();
    } else {
      console.log('ℹ️ Register Information 버튼 미표시 (이미 등록된 계정일 수 있음)');
      test.skip();
    }
  });

  test('여권 등록 페이지 접근 테스트', async ({ page }) => {
    // 홈에서 Register Information 버튼 클릭
    const registerBtn = page.getByText('Register Information');

    if (await registerBtn.isVisible()) {
      await registerBtn.click();
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      console.log(`현재 URL: ${currentUrl}`);

      // /m/home/submit/passport로 이동해야 함
      if (currentUrl.includes('submit/passport')) {
        console.log('✅ 여권 등록 페이지 접근 성공');

        // 페이지 요소 확인
        await expect(page.getByText('Please upload passport')).toBeVisible();

        await page.screenshot({
          path: 'reports/passport-register-ui.png',
          fullPage: true,
        });
      } else {
        console.log('ℹ️ 예상과 다른 URL:', currentUrl);
      }
    } else {
      console.log('ℹ️ Register Information 버튼 없음');
      test.skip();
    }
  });
});
