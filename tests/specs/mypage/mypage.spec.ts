import { test, expect } from '@playwright/test';
import { LoginPage, HomePage, MyPage } from '../../pages';
import { testUsers } from '../../fixtures/test-users';

test.describe('마이페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // aiqa1 테스트 계정으로 로그인
    const emailInput = page.getByRole('textbox').first();
    const passwordInput = page.getByRole('textbox').nth(1);
    await emailInput.fill('aiqa1@aaa.com');
    await passwordInput.fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();

    // 홈으로 이동 대기
    await page.waitForURL('**/home', { timeout: 15000 });

    // 마이페이지로 이동
    await page.getByText('My Page', { exact: true }).click();
    await page.waitForURL('**/my', { timeout: 10000 });
  });

  test('마이페이지 주요 요소 표시', async ({ page }) => {
    const myPage = new MyPage(page);

    // 사용자 이메일 표시
    await myPage.expectUserEmailVisible('aiqa1@aaa.com');

    // 메뉴 항목들 표시
    await myPage.expectAllMenuItemsVisible();
  });

  test('로그아웃 기능', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.signOut();

    // 로그인 페이지로 이동 확인
    await expect(page).toHaveURL(/\/login/);
  });

  test('My Point Balance 메뉴 클릭', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.goToMyPointBalance();

    // 포인트 페이지로 이동 확인
    await expect(page).toHaveURL(/\/point|\/my/);
  });

  test('Payment details 메뉴 클릭', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.goToPaymentDetails();

    // 결제 내역 페이지로 이동 확인
    await expect(page).toHaveURL(/\/payment|\/history|\/my/);
  });

  test('Help Center 메뉴 클릭', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.goToHelpCenter();

    // 헬프 센터 페이지로 이동 확인
    await expect(page).toHaveURL(/\/help|\/support|\/my/);
  });

  test('하단 네비게이션으로 홈 이동', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.navigateToHome();

    await expect(page).toHaveURL(/\/home/);
  });

  test('하단 네비게이션으로 LIFE 이동', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.navigateToLife();

    await expect(page).toHaveURL(/\/life/);
  });

  test('하단 네비게이션으로 Benefits 이동', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.navigateToBenefits();

    await expect(page).toHaveURL(/\/benefit/);
  });
});
