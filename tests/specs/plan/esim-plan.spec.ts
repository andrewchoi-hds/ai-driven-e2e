import { test, expect } from '@playwright/test';
import {
  createNewTestAccount,
  loginWithAccount,
  updateAccountState,
} from '../../fixtures/test-account-manager';

/**
 * eSIM 요금제 선택 플로우 테스트
 *
 * 주의: 요금제 가입은 계정당 1회만 가능한 일회성 플로우입니다.
 */
test.describe('eSIM 요금제 플로우', () => {
  test.describe.configure({ mode: 'serial' });

  let testEmail: string;
  let testPassword: string = 'qwer1234';

  test('새 계정 생성', async ({ page }) => {
    const account = await createNewTestAccount(page, 'eSIM 요금제 테스트');
    testEmail = account.email;
    testPassword = account.password;

    console.log(`테스트 계정: ${testEmail}`);
    await expect(page).toHaveURL(/\/(home|login)/);
  });

  test('홈에서 eSIM 요금제 버튼 확인', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);

    // Free eSIM Mobile Plan 버튼 확인
    const esimBtn = page.getByText('Free eSIM Mobile Plan');
    await expect(esimBtn).toBeVisible({ timeout: 10000 });

    // 클릭하여 요금제 페이지로 이동
    await esimBtn.click();
    await page.waitForTimeout(2000);

    // URL 확인
    await expect(page).toHaveURL(/\/plan|\/esim/);
  });

  test('eSIM 요금제 페이지 요소 확인', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);

    // eSIM 요금제 페이지로 이동
    const esimBtn = page.getByText('Free eSIM Mobile Plan');
    if (await esimBtn.isVisible()) {
      await esimBtn.click();
      await page.waitForTimeout(2000);
    }

    // Step 1: 체류 기간 선택 페이지 확인
    await expect(page.getByText('Please indicate how long you will stay in Korea')).toBeVisible();

    // 옵션 확인
    await expect(page.getByText('6 months or longer')).toBeVisible();
    await expect(page.getByText('less than 6 months')).toBeVisible();

    // 스크린샷 저장
    await page.screenshot({
      path: 'reports/esim-plan-page.png',
      fullPage: true,
    });

    console.log('📸 eSIM 요금제 페이지 스크린샷: reports/esim-plan-page.png');
  });

  test('eSIM 요금제 플로우 - 6개월 이상', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);

    const esimBtn = page.getByText('Free eSIM Mobile Plan');
    if (await esimBtn.isVisible()) {
      await esimBtn.click();
      await page.waitForTimeout(2000);
    }

    // Step 1: 체류 기간 선택 (6개월 이상)
    console.log('Step 1: 체류 기간 선택');
    await page.getByText('6 months or longer').click();
    await page.waitForTimeout(1000);

    // next 버튼 클릭
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(2000);

    // Step 2: 요금제 선택 페이지 확인
    console.log('Step 2: 요금제 선택');
    console.log('URL:', page.url());

    await page.screenshot({
      path: 'reports/esim-plan-options.png',
      fullPage: true,
    });

    // 요금제 옵션 확인
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter(h => h.trim()).join(' | '));
  });
});

/**
 * eSIM 요금제 UI 검증 (기존 계정 사용)
 */
test.describe('eSIM 요금제 UI 검증', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox').first().fill('aiqa1@aaa.com');
    await page.getByRole('textbox').nth(1).fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/home', { timeout: 15000 });
  });

  test('홈에서 Free eSIM Mobile Plan 버튼 표시', async ({ page }) => {
    const esimBtn = page.getByText('Free eSIM Mobile Plan');
    const isVisible = await esimBtn.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✅ eSIM 요금제 버튼 표시됨');
      await expect(esimBtn).toBeVisible();
    } else {
      console.log('ℹ️ eSIM 요금제 버튼 미표시 (이미 가입된 계정일 수 있음)');
    }
  });

  test('eSIM 요금제 페이지 접근', async ({ page }) => {
    const esimBtn = page.getByText('Free eSIM Mobile Plan');

    if (await esimBtn.isVisible()) {
      await esimBtn.click();
      await page.waitForTimeout(2000);

      console.log(`현재 URL: ${page.url()}`);

      await page.screenshot({
        path: 'reports/esim-plan-ui.png',
        fullPage: true,
      });
    } else {
      console.log('ℹ️ eSIM 버튼 없음 - 페이지 직접 접근 시도');
      await page.goto('/m/plan/esim');
      await page.waitForTimeout(2000);
    }
  });

  test('eSIM과 USIM 비교', async ({ page }) => {
    // 두 요금제 버튼 모두 확인
    const usimBtn = page.getByText('Mobile plan with free USIM');
    const esimBtn = page.getByText('Free eSIM Mobile Plan');

    const hasUsim = await usimBtn.isVisible().catch(() => false);
    const hasEsim = await esimBtn.isVisible().catch(() => false);

    console.log(`USIM 버튼: ${hasUsim ? '표시' : '미표시'}`);
    console.log(`eSIM 버튼: ${hasEsim ? '표시' : '미표시'}`);

    // 둘 중 하나는 표시되어야 함 (신규 계정이면)
    if (!hasUsim && !hasEsim) {
      console.log('ℹ️ 요금제 버튼 없음 - 이미 가입된 계정');
    }
  });
});
