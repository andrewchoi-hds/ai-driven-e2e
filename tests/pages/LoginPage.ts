import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // Form Fields
  readonly emailInput: Locator;
  readonly passwordInput: Locator;

  // Buttons
  readonly logInButton: Locator;
  readonly findPasswordButton: Locator;
  readonly signUpButton: Locator;

  // Footer Links
  readonly termsAndConditionsButton: Locator;
  readonly privacyPolicyButton: Locator;
  readonly refundPolicyButton: Locator;
  readonly faqButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form Fields
    this.emailInput = this.page.locator('#email');
    this.passwordInput = this.page.locator('#password');

    // Buttons (영어/한국어 이중 언어 지원)
    this.logInButton = this.page.getByRole('button', { name: /Log in|로그인/i });
    this.findPasswordButton = this.page.getByRole('button', { name: /Find Password|비밀번호 찾기/i });
    this.signUpButton = this.page.getByRole('button', { name: /Sign Up|가입하기/i });

    // Footer Links
    this.termsAndConditionsButton = this.page.getByRole('button', { name: 'Terms and Conditions' });
    this.privacyPolicyButton = this.page.getByRole('button', { name: 'Privacy Policy' });
    this.refundPolicyButton = this.page.getByRole('button', { name: 'Refund Policy' });
    this.faqButton = this.page.getByRole('button', { name: 'FAQ' });
  }

  // Navigation
  async goto() {
    await this.page.goto('/login');
  }

  // Actions
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    // 버튼 활성화 대기 (이메일/비밀번호 입력 후 활성화까지 시간 필요)
    await this.logInButton.waitFor({ state: 'visible' });
    await this.page.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]');
        return btn && !btn.hasAttribute('disabled') && btn.getAttribute('aria-disabled') !== 'true';
      },
      { timeout: 10000 }
    );
    await this.logInButton.click();
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickLogin() {
    await this.logInButton.click();
  }

  async clickSignUp() {
    await this.signUpButton.click();
  }

  async clickFindPassword() {
    await this.findPasswordButton.click();
  }

  // Assertions
  async expectToBeVisible() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.logInButton).toBeVisible();
  }

  async expectEmailError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  async expectPasswordError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
