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

  // 메뉴 아이템 (영문 UI)
  readonly myPointBalanceMenu: Locator;
  readonly paymentDetailsMenu: Locator;
  readonly helpCenterMenu: Locator;
  readonly termsAndConditionsMenu: Locator;
  readonly privacyPolicyMenu: Locator;
  readonly signOutMenu: Locator;

  // 하단 네비게이션
  readonly navHome: Locator;
  readonly navLife: Locator;
  readonly navBenefits: Locator;
  readonly navMyPage: Locator;

  constructor(page: Page) {
    this.page = page;

    // 사용자 정보
    this.userEmail = page.locator('text=@').first();
    this.qrCodeButton = page.locator('button:has(svg), [aria-label*="QR"]').first();
    this.settingsButton = page.locator('button:has(svg[class*="settings"]), [aria-label*="settings"]').first();

    // 메뉴 아이템 (영문 UI - 한/영 이중 언어 지원)
    this.myPointBalanceMenu = page.getByText(/My Point Balance|내 보유 포인트/);
    this.paymentDetailsMenu = page.getByText(/Payment details|결제 내역/);
    this.helpCenterMenu = page.getByText(/Help Center|헬프 센터/);
    this.termsAndConditionsMenu = page.getByText(/Terms and Conditions|서비스 이용 약관/).first();
    this.privacyPolicyMenu = page.getByText(/Privacy Policy|개인정보처리방침/).first();
    this.signOutMenu = page.getByText(/Sign out|로그아웃/);

    // 하단 네비게이션 (영문)
    this.navHome = page.getByText('Home', { exact: true });
    this.navLife = page.getByText('LIFE', { exact: true });
    this.navBenefits = page.getByText('Benefits', { exact: true });
    this.navMyPage = page.getByText('My Page', { exact: true });
  }

  async goto() {
    await this.page.goto('/m/my');
    await this.page.waitForLoadState('domcontentloaded');
  }

  // 메뉴 클릭 액션
  async goToMyPointBalance() {
    await this.myPointBalanceMenu.click();
  }

  async goToPaymentDetails() {
    await this.paymentDetailsMenu.click();
  }

  async goToHelpCenter() {
    await this.helpCenterMenu.click();
  }

  async goToTermsAndConditions() {
    await this.termsAndConditionsMenu.click();
  }

  async goToPrivacyPolicy() {
    await this.privacyPolicyMenu.click();
  }

  async signOut() {
    await this.signOutMenu.click();
    await this.page.waitForURL(/\/login/);
  }

  // 네비게이션 메서드
  async navigateToHome() {
    await this.navHome.click();
    await this.page.waitForURL('**/home');
  }

  async navigateToLife() {
    await this.navLife.click();
    await this.page.waitForURL('**/life');
  }

  async navigateToBenefits() {
    await this.navBenefits.click();
    await this.page.waitForURL('**/benefit');
  }

  // Assertions
  async expectToBeOnMyPage() {
    await expect(this.page).toHaveURL(/\/m\/my/);
    await expect(this.signOutMenu).toBeVisible();
  }

  async expectUserEmailVisible(email: string) {
    await expect(this.page.getByText(email)).toBeVisible();
  }

  async expectAllMenuItemsVisible() {
    await expect(this.myPointBalanceMenu).toBeVisible();
    await expect(this.paymentDetailsMenu).toBeVisible();
    await expect(this.helpCenterMenu).toBeVisible();
    await expect(this.termsAndConditionsMenu).toBeVisible();
    await expect(this.privacyPolicyMenu).toBeVisible();
    await expect(this.signOutMenu).toBeVisible();
  }
}
