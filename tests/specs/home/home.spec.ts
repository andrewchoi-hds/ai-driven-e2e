import { test, expect } from '@playwright/test';
import { LoginPage, HomePage, PassportPage, MobilePlanPage } from '../../pages';

test.describe('홈 페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('aiqa1@aaa.com', 'qwer1234');
    await page.waitForURL('**/home');
  });

  test('홈 페이지 주요 요소 표시', async ({ page }) => {
    const homePage = new HomePage(page);

    // 여권 등록 카드 또는 Register Information 버튼 표시
    const hasPassportCard = await homePage.hasPassportCard();
    const hasRegisterButton = await homePage.registerInfoButton.isVisible().catch(() => false);
    expect(hasPassportCard || hasRegisterButton).toBeTruthy();

    // USIM/eSIM 요금제 버튼 표시
    await expect(homePage.usimPlanButton).toBeVisible();
    await expect(homePage.esimPlanButton).toBeVisible();

    // 하단 네비게이션 표시
    await expect(homePage.navHome.first()).toBeVisible();
    await expect(homePage.navLife.first()).toBeVisible();
    await expect(homePage.navBenefit.first()).toBeVisible();
    await expect(homePage.navMyPage.first()).toBeVisible();
  });

  test('정보 등록하기 버튼 클릭 시 여권 등록 페이지로 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    // Register Information 버튼이 보이면 클릭
    const isVisible = await homePage.registerInfoButton.isVisible().catch(() => false);
    if (isVisible) {
      await homePage.goToPassportRegistration();
      await expect(page).toHaveURL(/\/submit\/passport/);
    } else {
      // 이미 여권 등록이 완료된 상태일 수 있음
      test.skip();
    }
  });

  test('유심 요금제 버튼 클릭 시 기간 선택 페이지로 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goToUsimPlan();

    const mobilePlanPage = new MobilePlanPage(page);
    await mobilePlanPage.expectToBeOnPeriodPage();
  });

  test('이심 요금제 버튼 클릭 시 기간 선택 페이지로 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goToEsimPlan();

    await expect(page).toHaveURL(/\/esim\//);
  });

  test('하단 네비게이션으로 Life 페이지 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToLife();

    await expect(page).toHaveURL(/\/life/);
  });

  test('하단 네비게이션으로 Benefits 페이지 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToBenefit();

    await expect(page).toHaveURL(/\/benefit/);
  });

  test('하단 네비게이션으로 MyPage 이동', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.navigateToMyPage();

    await expect(page).toHaveURL(/\/my/);
  });
});
