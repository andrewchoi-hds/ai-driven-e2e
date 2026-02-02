import { Page, Locator, expect } from '@playwright/test';

/**
 * 라이프 페이지 (유학생 생활 가이드)
 * URL: /m/life
 *
 * 2026-02-02 업데이트: 영어/한국어 이중 언어 지원
 */
export class LifePage {
  readonly page: Page;

  // 헤더
  readonly pageTitle: Locator;

  // 이벤트 카드
  readonly eventSection: Locator;
  readonly kLifeEvent: Locator;
  readonly moreButton: Locator;

  // 한국 생활 가이드 섹션
  readonly guideSection: Locator;

  // 하단 네비게이션
  readonly navHome: Locator;
  readonly navLife: Locator;
  readonly navBenefit: Locator;
  readonly navMyPage: Locator;

  constructor(page: Page) {
    this.page = page;

    // 헤더 (영어/한국어)
    this.pageTitle = page.getByText(/^LIFE$|^라이프$/i).first();

    // 이벤트 섹션 (영어/한국어)
    this.eventSection = page.getByText(/K-Life Support Event|유학생 이벤트/i).first();
    this.kLifeEvent = page.getByText(/K-Life Support Event/i).first();
    this.moreButton = page.getByRole('button', { name: /더보기|More/i });

    // 가이드 섹션 (영어/한국어)
    this.guideSection = page.getByText(/Guide to Life in Korea|한국 생활 가이드/i);

    // 하단 네비게이션 (영어/한국어)
    this.navHome = page.locator('#nav-button-visa').or(page.getByText(/^Home$|^홈$/i).first());
    this.navLife = page.locator('#nav-button-life').or(page.getByText(/^LIFE$|^라이프$/i).first());
    this.navBenefit = page.locator('#nav-button-benefit').or(page.getByText(/^Benefits$|^혜택$/i).first());
    this.navMyPage = page.locator('#nav-button-mypage').or(page.getByText(/^My Page$|^마이페이지$/i).first());
  }

  async goto() {
    await this.page.goto('/m/life');
    await this.page.waitForLoadState('networkidle');
  }

  async clickMoreButton() {
    await this.moreButton.click();
  }

  // 네비게이션 메서드
  async navigateToHome() {
    await this.navHome.first().click({ force: true });
    await this.page.waitForURL('**/home');
  }

  async navigateToBenefit() {
    await this.navBenefit.first().click({ force: true });
    await this.page.waitForURL('**/benefit');
  }

  async navigateToMyPage() {
    await this.navMyPage.first().click({ force: true });
    await this.page.waitForURL('**/my');
  }

  async expectToBeOnLifePage() {
    await expect(this.page).toHaveURL(/\/m\/life/);
  }
}
