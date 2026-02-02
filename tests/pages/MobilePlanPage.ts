import { Page, Locator, expect } from '@playwright/test';

/**
 * 통신 요금제 페이지
 * URL: /m/mobile-plan/pdp, /m/mobile-plan/usim/period
 *
 * 2026-02-02 업데이트: 영어/한국어 이중 언어 지원
 */
export class MobilePlanPage {
  readonly page: Page;

  // 요금제 메인 페이지 (PDP)
  readonly pageTitle: Locator;
  readonly planDescription: Locator;
  readonly viewPlanButton: Locator;

  // 체류 기간 선택 페이지
  readonly periodTitle: Locator;
  readonly sixMonthsOrLonger: Locator;
  readonly lessThanSixMonths: Locator;
  readonly nextButton: Locator;

  // 푸터
  readonly termsOfServiceLink: Locator;
  readonly privacyPolicyLink: Locator;
  readonly refundPolicyLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // 요금제 메인 페이지 (영어/한국어)
    this.pageTitle = page.getByText(/외국인 유학생 전용 요금제|Mobile Plan for International Students/i);
    this.planDescription = page.locator('[class*="description"], [class*="info"]').first();
    this.viewPlanButton = page.getByRole('button', { name: /플랜 보기|View Plan/i });

    // 체류 기간 선택 페이지 (영어/한국어)
    this.periodTitle = page.getByText(/한국에 얼마나 머무르는지 알려주세요|Please indicate how long you will stay in Korea/i);
    this.sixMonthsOrLonger = page.getByText(/6개월 이상|6 months or longer/i);
    this.lessThanSixMonths = page.getByText(/6개월 미만|less than 6 months/i);
    this.nextButton = page.getByRole('button', { name: /다음|next/i });

    // 푸터 (영어/한국어)
    this.termsOfServiceLink = page.getByText(/서비스 이용 약관|Terms and Conditions/i);
    this.privacyPolicyLink = page.getByText(/개인정보처리방침|Privacy Policy/i);
    this.refundPolicyLink = page.getByText(/환불규정|Refund Policy/i);
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

  async selectSixMonthsOrLonger() {
    await this.sixMonthsOrLonger.click();
  }

  async selectLessThanSixMonths() {
    await this.lessThanSixMonths.click();
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
