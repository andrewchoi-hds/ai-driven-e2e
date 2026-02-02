import { test, expect } from '@playwright/test';
import { LoginPage, HomePage, BenefitPage } from '../../pages';

test.describe('혜택 페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('aiqa1@aaa.com', 'qwer1234');
    await page.waitForURL('**/home');

    // 혜택 페이지로 이동
    const homePage = new HomePage(page);
    await homePage.navigateToBenefit();
  });

  test('혜택 페이지 주요 요소 표시', async ({ page }) => {
    const benefitPage = new BenefitPage(page);

    // 페이지 확인
    await benefitPage.expectToBeOnBenefitPage();
  });

  test('외국인등록증 연결 서비스 표시', async ({ page }) => {
    const benefitPage = new BenefitPage(page);

    await expect(benefitPage.foreignerIdTask).toBeVisible();
  });

  test('알림 구독 버튼 표시', async ({ page }) => {
    const benefitPage = new BenefitPage(page);

    await expect(benefitPage.subscribeButton).toBeVisible();
  });

  test('푸터 링크 표시', async ({ page }) => {
    const benefitPage = new BenefitPage(page);

    await expect(benefitPage.termsOfServiceLink.first()).toBeVisible();
    await expect(benefitPage.privacyPolicyLink.first()).toBeVisible();
    await expect(benefitPage.refundPolicyLink.first()).toBeVisible();
  });
});
