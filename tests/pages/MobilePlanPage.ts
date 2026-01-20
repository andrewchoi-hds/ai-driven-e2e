import { Page, Locator, expect } from '@playwright/test';

/**
 * 통신 요금제 페이지
 * URL: /m/mobile-plan/pdp, /m/mobile-plan/usim/period
 */
export class MobilePlanPage {
  readonly page: Page;

  // 요금제 메인 페이지 (PDP)
  readonly pageTitle: Locator;
  readonly planDescription: Locator;
  readonly viewPlanButton: Locator;

  // 체류 기간 선택 페이지
  readonly periodTitle: Locator;
  readonly periodOptions: Locator;
  readonly nextButton: Locator;

  // 푸터
  readonly termsOfServiceLink: Locator;
  readonly privacyPolicyLink: Locator;
  readonly refundPolicyLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // 요금제 메인 페이지
    this.pageTitle = page.getByText('외국인 유학생 전용 요금제');
    this.planDescription = page.locator('[class*="description"], [class*="info"]').first();
    this.viewPlanButton = page.getByRole('button', { name: '플랜 보기' });

    // 체류 기간 선택 페이지
    this.periodTitle = page.getByText('한국에 얼마나 머무르는지 알려주세요');
    this.periodOptions = page.locator('[class*="option"], [class*="period"], button[class*="select"]');
    this.nextButton = page.getByRole('button', { name: '다음' });

    // 푸터
    this.termsOfServiceLink = page.getByText('서비스 이용 약관');
    this.privacyPolicyLink = page.getByText('개인정보처리방침');
    this.refundPolicyLink = page.getByText('환불규정');
  }

  async gotoPdp() {
    await this.page.goto('/m/mobile-plan/pdp');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoUsimPeriod() {
    await this.page.goto('/m/mobile-plan/usim/period');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoEsimPeriod() {
    await this.page.goto('/m/mobile-plan/esim/period');
    await this.page.waitForLoadState('networkidle');
  }

  async clickViewPlan() {
    await this.viewPlanButton.click();
  }

  async selectPeriodOption(index: number) {
    const options = await this.periodOptions.all();
    if (options[index]) {
      await options[index].click();
    }
  }

  async clickNext() {
    await this.nextButton.click();
  }

  async expectToBeOnPdpPage() {
    await expect(this.page).toHaveURL(/\/mobile-plan\/pdp/);
    await expect(this.pageTitle).toBeVisible();
  }

  async expectToBeOnPeriodPage() {
    await expect(this.page).toHaveURL(/\/mobile-plan\/(usim|esim)\/period/);
    await expect(this.periodTitle).toBeVisible();
  }
}
