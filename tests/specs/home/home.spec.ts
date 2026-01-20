import { test, expect } from '@playwright/test';
import { LoginPage, HomePage, PassportPage, MobilePlanPage } from '../../pages';

test.describe('홈 페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test21@aaaa.com', 'qwer1234');
    await page.waitForURL('**/home');
  });

  test('홈 페이지 주요 요소 표시', async ({ page }) => {
    const homePage = new HomePage(page);

    // 본인 확인 카드 표시
    await expect(homePage.registerInfoButton).toBeVisible();

    // 관련 서비스 표시
    await expect(homePage.telecomButton).toBeVisible();
    await expect(homePage.airportButton).toBeVisible();

    // 요금제 버튼 표시
    await expect(homePage.usimPlanButton).toBeVisible();
    await expect(homePage.esimPlanButton).toBeVisible();

    // 하단 네비게이션 표시
    await expect(homePage.navHome).toBeVisible();
    await expect(homePage.navLife).toBeVisible();
    await expect(homePage.navBenefit).toBeVisible();
    await expect(homePage.navMyPage).toBeVisible();
  });

  test('정보 등록하기 버튼 클릭 시 여권 등록 페이지로 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goToPassportRegistration();

    const passportPage = new PassportPage(page);
    await passportPage.expectToBeOnPassportPage();
  });

  test('통신 버튼 클릭 시 요금제 페이지로 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goToTelecom();

    const mobilePlanPage = new MobilePlanPage(page);
    await mobilePlanPage.expectToBeOnPdpPage();
  });

  test('유심 요금제 버튼 클릭 시 기간 선택 페이지로 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goToUsimPlan();

    const mobilePlanPage = new MobilePlanPage(page);
    await mobilePlanPage.expectToBeOnPeriodPage();
  });

  test('공항 버튼 클릭 시 공항 페이지로 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goToAirport();

    await expect(page).toHaveURL(/\/airport/);
  });
});
