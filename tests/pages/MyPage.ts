import { Page, Locator, expect } from '@playwright/test';

/**
 * 마이페이지 (사용자 설정)
 * URL: /m/my
 */
export class MyPage {
  readonly page: Page;

  // 사용자 정보
  readonly userEmail: Locator;
  readonly qrCodeButton: Locator;
  readonly settingsButton: Locator;

  // 메뉴 아이템
  readonly myPointsMenu: Locator;
  readonly paymentHistoryMenu: Locator;
  readonly helpCenterMenu: Locator;
  readonly termsOfServiceMenu: Locator;
  readonly privacyPolicyMenu: Locator;
  readonly logoutMenu: Locator;

  // 하단 네비게이션
  readonly navHome: Locator;
  readonly navLife: Locator;
  readonly navBenefit: Locator;
  readonly navMyPage: Locator;

  constructor(page: Page) {
    this.page = page;

    // 사용자 정보
    this.userEmail = page.getByText('test21@aaaa.com');
    this.qrCodeButton = page.locator('[aria-label*="QR"], button:has(svg)').first();
    this.settingsButton = page.locator('[aria-label*="settings"], [aria-label*="설정"]').first();

    // 메뉴 아이템
    this.myPointsMenu = page.getByText('내 보유 포인트');
    this.paymentHistoryMenu = page.getByText('결제 내역');
    this.helpCenterMenu = page.getByText('헬프 센터');
    this.termsOfServiceMenu = page.getByText('서비스 이용 약관').first();
    this.privacyPolicyMenu = page.getByText('개인정보처리방침').first();
    this.logoutMenu = page.getByText('로그아웃');

    // 하단 네비게이션
    this.navHome = page.getByText('홈', { exact: true });
    this.navLife = page.getByText('라이프', { exact: true });
    this.navBenefit = page.getByText('혜택', { exact: true });
    this.navMyPage = page.getByText('마이페이지', { exact: true });
  }

  async goto() {
    await this.page.goto('/m/my');
    await this.page.waitForLoadState('networkidle');
  }

  async goToMyPoints() {
    await this.myPointsMenu.click();
  }

  async goToPaymentHistory() {
    await this.paymentHistoryMenu.click();
  }

  async goToHelpCenter() {
    await this.helpCenterMenu.click();
  }

  async goToTermsOfService() {
    await this.termsOfServiceMenu.click();
  }

  async goToPrivacyPolicy() {
    await this.privacyPolicyMenu.click();
  }

  async logout() {
    await this.logoutMenu.click();
    // 로그아웃 후 로그인 페이지로 이동 대기 (쿼리 파라미터 포함)
    await this.page.waitForURL(/\/login/);
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

  async navigateToBenefit() {
    await this.navBenefit.click({ force: true });
    await this.page.waitForURL('**/benefit');
  }

  async expectToBeOnMyPage() {
    await expect(this.page).toHaveURL(/\/m\/my/);
    await expect(this.logoutMenu).toBeVisible();
  }

  async expectUserEmailVisible(email: string) {
    await expect(this.page.getByText(email)).toBeVisible();
  }
}
