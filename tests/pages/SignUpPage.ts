import { Page, Locator, expect } from '@playwright/test';

/**
 * 회원가입 페이지 POM
 * URL: /m/signup
 *
 * 플로우:
 * 1. 이메일 입력 → next
 * 2. 인증 코드 입력 (QA: 000000) → Verification completed
 * 3. 비밀번호 설정 → next
 * 4. 약관 동의 → Next → 가입 완료
 */
export class SignupPage {
  readonly page: Page;

  // Step 1: 이메일 입력
  readonly emailInput: Locator;
  readonly emailNextButton: Locator;

  // Step 2: 인증 코드
  readonly verificationCodeInput: Locator;
  readonly resendCodeButton: Locator;
  readonly verificationCompletedButton: Locator;

  // Step 3: 비밀번호 설정
  readonly passwordInput: Locator;
  readonly passwordConfirmInput: Locator;
  readonly passwordNextButton: Locator;

  // Step 4: 약관 동의
  readonly agreeAllCheckbox: Locator;
  readonly visaIssuedCheckbox: Locator;
  readonly termsOfServiceCheckbox: Locator;
  readonly privacyPolicyCheckbox: Locator;
  readonly marketingCheckbox: Locator;
  readonly termsNextButton: Locator;

  // Step 5: 가입 완료
  readonly signupCompletedText: Locator;
  readonly confirmationButton: Locator;

  // 공통
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Step 1: 이메일
    this.emailInput = page.locator('#email');
    this.emailNextButton = page.getByRole('button', { name: 'next' });

    // Step 2: 인증 코드
    this.verificationCodeInput = page.locator('#verification-code');
    this.resendCodeButton = page.getByRole('button', { name: 'Resend verification code' });
    this.verificationCompletedButton = page.getByRole('button', { name: 'Verification completed' });

    // Step 3: 비밀번호
    this.passwordInput = page.locator('#password');
    this.passwordConfirmInput = page.locator('#passwordConfirm');
    this.passwordNextButton = page.getByRole('button', { name: 'next' });

    // Step 4: 약관 동의
    this.agreeAllCheckbox = page.getByText('Agree to all terms and conditions');
    this.visaIssuedCheckbox = page.getByText('A study/training visa has been issued');
    this.termsOfServiceCheckbox = page.getByText('Consent to Terms of Service');
    this.privacyPolicyCheckbox = page.getByText('Consent to Collection and Use of Personal Information');
    this.marketingCheckbox = page.getByText('Consent to Receive and Use Marketing Information');
    this.termsNextButton = page.getByRole('button', { name: 'Next' });

    // Step 5: 가입 완료
    this.signupCompletedText = page.getByText('Sign-up Completed');
    this.confirmationButton = page.getByRole('button', { name: /Confirmation|확인/i });

    // 공통 - 뒤로가기 버튼 (헤더 영역의 < 아이콘 버튼)
    this.backButton = page.locator('header button, [class*="header"] button, button:has(svg)').first();
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForTimeout(1000);
    await this.page.getByRole('button', { name: 'Sign Up' }).click();
    await this.page.waitForURL('**/signup');
  }

  async enterEmail(email: string) {
    await this.emailInput.fill(email);
    await this.emailNextButton.click();
    await this.verificationCodeInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async enterVerificationCode(code: string = '000000') {
    await this.verificationCodeInput.fill(code);
    await this.page.waitForTimeout(1000);
    await this.verificationCompletedButton.click();
    await this.passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async setPassword(password: string) {
    await this.passwordInput.fill(password);
    await this.passwordConfirmInput.fill(password);
    await this.passwordNextButton.click();
    await this.agreeAllCheckbox.waitFor({ state: 'visible', timeout: 10000 });
  }

  async agreeToTerms(includeMarketing: boolean = true) {
    await this.agreeAllCheckbox.click();
    await this.page.waitForTimeout(500);
  }

  async submitSignup() {
    await this.termsNextButton.click();

    // 가입 완료 화면 대기 (Sign-up Completed 또는 Confirmation 버튼)
    await this.page.waitForTimeout(3000);

    // Confirmation 버튼이 있으면 클릭
    if (await this.confirmationButton.count() > 0) {
      await this.confirmationButton.click();
      await this.page.waitForTimeout(2000);
    }

    // 최종 URL 확인
    await this.page.waitForURL(/\/(home|login)/, { timeout: 15000 });
  }

  async completeSignup(email: string, password: string, verificationCode: string = '000000') {
    await this.enterEmail(email);
    await this.enterVerificationCode(verificationCode);
    await this.setPassword(password);
    await this.agreeToTerms();
    await this.submitSignup();
  }

  async isSignupCompleted(): Promise<boolean> {
    return await this.signupCompletedText.count() > 0 || await this.confirmationButton.count() > 0;
  }

  async isEmailDuplicate(): Promise<boolean> {
    const errorMessage = this.page.getByText(/already|duplicate|exist|이미|중복/i);
    return await errorMessage.count() > 0;
  }

  async getCurrentStep(): Promise<'email' | 'verification' | 'password' | 'terms' | 'unknown'> {
    if (await this.emailInput.isVisible()) return 'email';
    if (await this.verificationCodeInput.isVisible()) return 'verification';
    if (await this.passwordInput.isVisible()) return 'password';
    if (await this.agreeAllCheckbox.isVisible()) return 'terms';
    return 'unknown';
  }
}
