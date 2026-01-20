import { test, expect } from '@playwright/test';
import { LoginPage, HomePage, LifePage, BenefitPage, MyPage } from '../../pages';

test.describe('하단 네비게이션', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test21@aaaa.com', 'qwer1234');
    await page.waitForURL('**/home');
  });

  test('홈에서 라이프 페이지로 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToLife();

    const lifePage = new LifePage(page);
    await lifePage.expectToBeOnLifePage();
  });

  test('홈에서 혜택 페이지로 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToBenefit();

    const benefitPage = new BenefitPage(page);
    await benefitPage.expectToBeOnBenefitPage();
  });

  test('홈에서 마이페이지로 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToMyPage();

    const myPage = new MyPage(page);
    await myPage.expectToBeOnMyPage();
  });

  test('마이페이지에서 홈으로 이동', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigateToMyPage();

    const myPage = new MyPage(page);
    await myPage.navigateToHome();

    await homePage.expectToBeOnHomePage();
  });

  test('라이프에서 혜택으로 이동', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigateToLife();

    const lifePage = new LifePage(page);
    await lifePage.navigateToBenefit();

    const benefitPage = new BenefitPage(page);
    await benefitPage.expectToBeOnBenefitPage();
  });
});
