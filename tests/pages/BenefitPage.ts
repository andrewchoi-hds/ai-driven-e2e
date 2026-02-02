import { Page, Locator, expect } from '@playwright/test';

/**
 * 혜택 페이지
 * URL: /benefit
 *
 * 2026-02-02 업데이트: 영어/한국어 이중 언어 지원
 */
export class BenefitPage {
  readonly page: Page;

  // 헤더
  readonly pageTitle: Locator;
  readonly subtitle: Locator;

  // 서비스 확인 섹션
  readonly foreignerIdTask: Locator;
  readonly notificationCard: Locator;
  readonly subscribeButton: Locator;

  // 하단 네비게이션
  readonly navHome: Locator;
  readonly navLife: Locator;
  readonly navBenefit: Locator;
  readonly navMyPage: Locator;

  // 푸터
  readonly termsOfServiceLink: Locator;
  readonly privacyPolicyLink: Locator;
  readonly refundPolicyLink: Locator;
  readonly faqLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // 헤더 (영어/한국어)
    this.pageTitle = page.getByText(/^Benefit$|^혜택$/i).first();
    this.subtitle = page.getByText(/Please check the service|서비스를 확인해 보세요/i);

    // 서비스 확인 섹션 (영어/한국어)
    this.foreignerIdTask = page.getByText(/Connect phone number to RC|전화번호에 외국인등록증 연결하기/i);
    this.notificationCard = page.getByText(/Once the RC processing is underway|외국인등록증 심사가 진행되면/i);
    this.subscribeButton = page.getByRole('button', { name: /Agree and receive notification|동의하고 알림 받기/i });

    // 하단 네비게이션 (영어/한국어)
    this.navHome = page.locator('#nav-button-visa').or(page.getByText(/^Home$|^홈$/i).first());
    this.navLife = page.locator('#nav-button-life').or(page.getByText(/^LIFE$|^라이프$/i).first());
    this.navBenefit = page.locator('#nav-button-benefit').or(page.getByText(/^Benefits$|^혜택$/i).first());
    this.navMyPage = page.locator('#nav-button-mypage').or(page.getByText(/^My Page$|^마이페이지$/i).first());

    // 푸터 링크 (영어/한국어)
    this.termsOfServiceLink = page.getByText(/Terms and Conditions|서비스 이용 약관|이용약관/i);
    this.privacyPolicyLink = page.getByText(/Privacy Policy|개인정보처리방침/i);
    this.refundPolicyLink = page.getByText(/Refund Policy|환불규정|환불 정책/i);
    this.faqLink = page.getByText(/^FAQ$|자주 묻는 질문/i);
  }

  async goto() {
    await this.page.goto('/benefit');
    await this.page.waitForLoadState('networkidle');
  }

  async clickForeignerIdTask() {
    await this.foreignerIdTask.click();
  }

  async subscribeToNotifications() {
    await this.subscribeButton.click();
  }

  // 네비게이션 메서드
  async navigateToHome() {
    await this.navHome.first().click({ force: true });
    await this.page.waitForURL('**/home');
  }

  async navigateToLife() {
    await this.navLife.first().click({ force: true });
    await this.page.waitForURL('**/life');
  }

  async navigateToMyPage() {
    await this.navMyPage.first().click({ force: true });
    await this.page.waitForURL('**/my');
  }

  async expectToBeOnBenefitPage() {
    await expect(this.page).toHaveURL(/\/benefit/);
  }
}
