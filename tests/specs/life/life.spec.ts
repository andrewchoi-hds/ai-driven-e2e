import { test, expect } from '@playwright/test';
import { LoginPage, HomePage, LifePage } from '../../pages';

test.describe('라이프 페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('aiqa1@aaa.com', 'qwer1234');
    await page.waitForURL('**/home');

    // 라이프 페이지로 이동
    const homePage = new HomePage(page);
    await homePage.navigateToLife();
  });

  test('라이프 페이지 주요 요소 표시', async ({ page }) => {
    const lifePage = new LifePage(page);

    // 페이지 URL 확인
    await lifePage.expectToBeOnLifePage();

    // 가이드 섹션 표시 (Guide to Life in Korea / 한국 생활 가이드)
    await expect(lifePage.guideSection).toBeVisible();
  });

  test('이벤트 섹션 표시', async ({ page }) => {
    const lifePage = new LifePage(page);

    // K-Life Support Event 섹션 표시
    await expect(lifePage.eventSection).toBeVisible();
  });

  test('더보기 버튼 표시', async ({ page }) => {
    const lifePage = new LifePage(page);

    await expect(lifePage.moreButton).toBeVisible();
  });

  test('하단 네비게이션으로 홈 이동', async ({ page }) => {
    const lifePage = new LifePage(page);

    await lifePage.navigateToHome();

    await expect(page).toHaveURL(/\/home/);
  });

  test('하단 네비게이션으로 Benefits 이동', async ({ page }) => {
    const lifePage = new LifePage(page);

    await lifePage.navigateToBenefit();

    await expect(page).toHaveURL(/\/benefit/);
  });
});
