import { test, expect } from '@playwright/test';
import { LoginPage, HomePage, LifePage } from '../../pages';

test.describe('라이프 페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test21@aaaa.com', 'qwer1234');
    await page.waitForURL('**/home');

    // 라이프 페이지로 이동
    const homePage = new HomePage(page);
    await homePage.navigateToLife();
  });

  test('라이프 페이지 주요 요소 표시', async ({ page }) => {
    const lifePage = new LifePage(page);

    // 페이지 제목 확인
    await lifePage.expectToBeOnLifePage();

    // 유학생 이벤트 섹션 표시
    await expect(lifePage.subtitle).toBeVisible();

    // 한국 생활 가이드 섹션 표시
    await expect(lifePage.guideSection).toBeVisible();
  });

  test('숙박 이벤트 카드 표시', async ({ page }) => {
    const lifePage = new LifePage(page);

    await expect(lifePage.eventCard).toBeVisible();
  });

  test('영화 할인 가이드 표시', async ({ page }) => {
    const lifePage = new LifePage(page);

    await expect(lifePage.movieDiscountGuide).toBeVisible();
  });

  test('생활비 절약 가이드 표시', async ({ page }) => {
    const lifePage = new LifePage(page);

    await expect(lifePage.savingsGuide).toBeVisible();
  });

  test('약국 가이드 표시', async ({ page }) => {
    const lifePage = new LifePage(page);

    await expect(lifePage.pharmacyGuide).toBeVisible();
  });
});
