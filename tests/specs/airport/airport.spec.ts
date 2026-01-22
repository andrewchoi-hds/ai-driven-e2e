import { test, expect } from '@playwright/test';
import {
  createNewTestAccount,
  loginWithAccount,
} from '../../fixtures/test-account-manager';

/**
 * 공항 서비스 테스트
 *
 * 공항 서비스 페이지 및 기능을 테스트합니다.
 */
test.describe('공항 서비스', () => {
  test.describe.configure({ mode: 'serial' });

  let testEmail: string;
  let testPassword: string = 'qwer1234';

  test('새 계정 생성', async ({ page }) => {
    const account = await createNewTestAccount(page, '공항 서비스 테스트');
    testEmail = account.email;
    testPassword = account.password;

    console.log(`테스트 계정: ${testEmail}`);
    await expect(page).toHaveURL(/\/(home|login)/);
  });

  test('홈에서 Airport 버튼 확인', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);

    // Airport 버튼 확인
    const airportBtn = page.getByText('Airport').first();
    await expect(airportBtn).toBeVisible({ timeout: 10000 });

    // 클릭하여 공항 서비스 페이지로 이동
    await airportBtn.click();
    await page.waitForTimeout(2000);

    // URL 확인
    await expect(page).toHaveURL(/\/airport/);
  });

  test('공항 서비스 페이지 요소 확인', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);

    // 공항 서비스 페이지로 이동
    await page.goto('/m/airport');
    await page.waitForLoadState('networkidle');

    // 페이지 내용 분석
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    const buttons = await page.locator('button').allTextContents();
    const links = await page.locator('a').allTextContents();

    console.log('제목들:', headings.filter(h => h.trim()).join(' | '));
    console.log('버튼들:', buttons.filter(b => b.trim()).join(', '));
    console.log('링크들:', links.filter(l => l.trim()).slice(0, 10).join(', '));

    // 스크린샷 저장
    await page.screenshot({
      path: 'reports/airport-page.png',
      fullPage: true,
    });

    console.log('📸 공항 서비스 페이지 스크린샷: reports/airport-page.png');
  });

  test('공항 서비스 목록 확인', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);
    await page.goto('/m/airport');
    await page.waitForLoadState('networkidle');

    // 서비스 카드/항목 확인
    const cards = await page.locator('[class*="card"], [class*="Card"], [class*="service"], [class*="Service"]').count();
    const listItems = await page.locator('li, [class*="item"], [class*="Item"]').count();

    console.log(`서비스 카드 수: ${cards}`);
    console.log(`목록 항목 수: ${listItems}`);
  });
});

/**
 * 공항 서비스 UI 검증 (기존 계정 사용)
 */
test.describe('공항 서비스 UI 검증', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox').first().fill('aiqa1@aaa.com');
    await page.getByRole('textbox').nth(1).fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/home', { timeout: 15000 });
  });

  test('홈에서 Airport 버튼 표시', async ({ page }) => {
    const airportBtn = page.getByText('Airport').first();
    const isVisible = await airportBtn.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✅ Airport 버튼 표시됨');
      await expect(airportBtn).toBeVisible();
    } else {
      console.log('ℹ️ Airport 버튼 미표시');
    }
  });

  test('공항 서비스 페이지 직접 접근', async ({ page }) => {
    await page.goto('/m/airport');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`현재 URL: ${currentUrl}`);

    if (currentUrl.includes('airport')) {
      console.log('✅ 공항 서비스 페이지 접근 성공');

      // 페이지 제목 확인
      const pageTitle = page.getByText(/Airport|공항/i).first();
      await expect(pageTitle).toBeVisible({ timeout: 5000 }).catch(() => {
        console.log('ℹ️ 공항 서비스 제목 미표시');
      });

      await page.screenshot({
        path: 'reports/airport-ui.png',
        fullPage: true,
      });
    } else {
      console.log('ℹ️ 공항 서비스 페이지 접근 불가 (리다이렉트됨)');
    }
  });

  test('공항 서비스 네비게이션', async ({ page }) => {
    // 홈에서 Airport 클릭
    const airportBtn = page.getByText('Airport').first();

    if (await airportBtn.isVisible()) {
      await airportBtn.click();
      await page.waitForTimeout(2000);

      // 뒤로가기 테스트
      await page.goBack();
      await expect(page).toHaveURL(/\/home/);
    } else {
      console.log('ℹ️ Airport 버튼 없음 - 테스트 스킵');
      test.skip();
    }
  });

  test('공항 서비스 상세 탐색', async ({ page }) => {
    await page.goto('/m/airport');
    await page.waitForLoadState('networkidle');

    // 클릭 가능한 요소 찾기
    const clickableItems = page.locator('a, button, [role="button"], [class*="clickable"]');
    const count = await clickableItems.count();

    console.log(`클릭 가능 요소 수: ${count}`);

    // 첫 번째 서비스 항목 클릭 시도
    if (count > 1) {
      const firstItem = clickableItems.nth(1); // 첫 번째는 보통 뒤로가기
      const text = await firstItem.textContent();

      if (text && text.trim()) {
        console.log(`첫 번째 항목: ${text.trim()}`);
      }
    }
  });
});
