import { Page, Locator, expect } from '@playwright/test';

/**
 * 혜택 페이지
 * URL: /benefit
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

    // 헤더
    this.pageTitle = page.getByText('혜택', { exact: true }).first();
    this.subtitle = page.getByText('서비스를 확인해 보세요');

    // 서비스 확인 섹션
    this.foreignerIdTask = page.getByText('전화번호에 외국인등록증 연결하기');
    this.notificationCard = page.getByText('외국인등록증 심사가 진행되면');
    this.subscribeButton = page.getByRole('button', { name: '동의하고 알림 받기' });

    // 하단 네비게이션
    this.navHome = page.getByText('홈', { exact: true });
    this.navLife = page.getByText('라이프', { exact: true });
    this.navBenefit = page.getByText('혜택', { exact: true });
    this.navMyPage = page.getByText('마이페이지', { exact: true });

    // 푸터 링크
    this.termsOfServiceLink = page.getByText('서비스 이용 약관');
    this.privacyPolicyLink = page.getByText('개인정보처리방침');
    this.refundPolicyLink = page.getByText('환불규정');
    this.faqLink = page.getByText('자주 묻는 질문');
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
    await this.navHome.click({ force: true });
    await this.page.waitForURL('**/home');
  }

  async navigateToLife() {
    await this.navLife.click({ force: true });
    await this.page.waitForURL('**/life');
  }

  async navigateToMyPage() {
    await this.navMyPage.click({ force: true });
    await this.page.waitForURL('**/my');
  }

  async expectToBeOnBenefitPage() {
    await expect(this.page).toHaveURL(/\/benefit/);
    await expect(this.subtitle).toBeVisible();
  }
}
