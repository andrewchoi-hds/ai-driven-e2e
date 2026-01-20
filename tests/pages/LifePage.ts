import { Page, Locator, expect } from '@playwright/test';

/**
 * 라이프 페이지 (유학생 생활 가이드)
 * URL: /m/life
 */
export class LifePage {
  readonly page: Page;

  // 헤더
  readonly pageTitle: Locator;
  readonly subtitle: Locator;

  // 이벤트 카드
  readonly eventCard: Locator;
  readonly accommodationEvent: Locator;

  // 한국 생활 가이드 섹션
  readonly guideSection: Locator;
  readonly movieDiscountGuide: Locator;
  readonly savingsGuide: Locator;
  readonly pharmacyGuide: Locator;

  // 하단 네비게이션
  readonly navHome: Locator;
  readonly navLife: Locator;
  readonly navBenefit: Locator;
  readonly navMyPage: Locator;

  constructor(page: Page) {
    this.page = page;

    // 헤더
    this.pageTitle = page.locator('h1, h2').filter({ hasText: '라이프' }).first();
    this.subtitle = page.getByText('유학생들을 위한');

    // 이벤트
    this.eventCard = page.getByText('숙박비 0원! 1박 2일 여행');
    this.accommodationEvent = page.getByText('리뷰 올리면 숙박이 공짜');

    // 가이드 섹션
    this.guideSection = page.getByText('한국 생활 가이드');
    this.movieDiscountGuide = page.getByText('영화 티켓 50% 할인 받는 방법');
    this.savingsGuide = page.getByText('똑똑한 생활비 절약 방법');
    this.pharmacyGuide = page.getByText('한국 약국 생존 가이드');

    // 하단 네비게이션
    this.navHome = page.getByText('홈', { exact: true });
    this.navLife = page.getByText('라이프', { exact: true });
    this.navBenefit = page.getByText('혜택', { exact: true });
    this.navMyPage = page.getByText('마이페이지', { exact: true });
  }

  async goto() {
    await this.page.goto('/m/life');
    await this.page.waitForLoadState('networkidle');
  }

  async clickEventCard() {
    await this.eventCard.click();
  }

  async clickMovieDiscountGuide() {
    await this.movieDiscountGuide.click();
  }

  async clickSavingsGuide() {
    await this.savingsGuide.click();
  }

  async clickPharmacyGuide() {
    await this.pharmacyGuide.click();
  }

  // 네비게이션 메서드
  async navigateToHome() {
    await this.navHome.click({ force: true });
    await this.page.waitForURL('**/home');
  }

  async navigateToBenefit() {
    await this.navBenefit.click({ force: true });
    await this.page.waitForURL('**/benefit');
  }

  async navigateToMyPage() {
    await this.navMyPage.click({ force: true });
    await this.page.waitForURL('**/my');
  }

  async expectToBeOnLifePage() {
    await expect(this.page).toHaveURL(/\/m\/life/);
    await expect(this.guideSection).toBeVisible();
  }
}
