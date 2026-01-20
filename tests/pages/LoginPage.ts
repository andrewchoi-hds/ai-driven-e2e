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

    // Buttons
    this.logInButton = this.page.getByRole('button', { name: 'Log in' });
    this.findPasswordButton = this.page.getByRole('button', { name: 'Find Password' });
    this.signUpButton = this.page.getByRole('button', { name: 'Sign Up' });

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
