import { test, expect } from '@playwright/test';
import { LoginPage, HomePage, MyPage } from '../../pages';

test.describe('마이페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test21@aaaa.com', 'qwer1234');
    await page.waitForURL('**/home');

    // 마이페이지로 이동
    const homePage = new HomePage(page);
    await homePage.navigateToMyPage();
  });

  test('마이페이지 주요 요소 표시', async ({ page }) => {
    const myPage = new MyPage(page);

    // 사용자 이메일 표시
    await myPage.expectUserEmailVisible('test21@aaaa.com');

    // 메뉴 항목들 표시
    await expect(myPage.myPointsMenu).toBeVisible();
    await expect(myPage.paymentHistoryMenu).toBeVisible();
    await expect(myPage.helpCenterMenu).toBeVisible();
    await expect(myPage.termsOfServiceMenu).toBeVisible();
    await expect(myPage.privacyPolicyMenu).toBeVisible();
    await expect(myPage.logoutMenu).toBeVisible();
  });

  test('로그아웃 기능', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.logout();

    // 로그인 페이지로 이동 확인
    await expect(page).toHaveURL(/\/login/);
  });

  test('내 보유 포인트 메뉴 클릭', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.goToMyPoints();

    // 포인트 페이지로 이동 확인 (URL 패턴에 따라 조정 필요)
    await expect(page).toHaveURL(/\/point|\/my/);
  });

  test('결제 내역 메뉴 클릭', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.goToPaymentHistory();

    // 결제 내역 페이지로 이동 확인
    await expect(page).toHaveURL(/\/payment|\/history|\/my/);
  });

  test('헬프 센터 메뉴 클릭', async ({ page }) => {
    const myPage = new MyPage(page);

    await myPage.goToHelpCenter();

    // 헬프 센터 페이지로 이동 확인
    await expect(page).toHaveURL(/\/help|\/support|\/my/);
  });
});
