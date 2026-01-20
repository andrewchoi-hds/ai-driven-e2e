import { test, expect } from '@playwright/test';
import { SignupPage } from '../../pages/SignupPage';
import { testUsers } from '../../fixtures/test-users';

/**
 * 회원가입 E2E 테스트
 *
 * 테스트 플로우:
 * 1. 이메일 입력 → next
 * 2. 인증 코드 입력 (QA: 000000) → Verification completed
 * 3. 비밀번호 설정 → next
 * 4. 약관 동의 → Next → 가입 완료
 */
test.describe('Signup Page', () => {
  let signupPage: SignupPage;

  test.beforeEach(async ({ page }) => {
    signupPage = new SignupPage(page);
    await signupPage.goto();
  });

  test.describe('Step 1: Email Input', () => {
    test('should display email input form', async () => {
      await expect(signupPage.emailInput).toBeVisible();
      await expect(signupPage.emailNextButton).toBeVisible();
    });

    test('should have disabled next button when email is empty', async () => {
      // 이메일이 비어있으면 next 버튼이 비활성화
      await expect(signupPage.emailNextButton).toBeDisabled();
    });

    test('should detect duplicate email', async ({ page }) => {
      // 이미 등록된 이메일 사용
      const existingEmail = testUsers.aiqa1.email;
      await signupPage.emailInput.fill(existingEmail);
      await page.waitForTimeout(500);
      await signupPage.emailNextButton.click({ force: true });
      await page.waitForTimeout(3000);

      // 중복 에러 메시지 확인
      const isDuplicate = await signupPage.isEmailDuplicate();
      expect(isDuplicate).toBe(true);
    });
  });

  test.describe('Step 2: Verification Code', () => {
    test('should display verification code input after email submission', async ({ page }) => {
      // 유니크한 이메일 생성
      const uniqueEmail = `verify-display-${Date.now()}@aaa.com`;
      await signupPage.emailInput.fill(uniqueEmail);
      await page.waitForTimeout(1000);

      // next 버튼 클릭
      await signupPage.emailNextButton.click({ force: true });

      // 인증 코드 입력 화면 대기
      await expect(signupPage.verificationCodeInput).toBeVisible({ timeout: 15000 });
      await expect(signupPage.verificationCompletedButton).toBeVisible();
    });

    test('should proceed to password step with valid code (000000)', async ({ page }) => {
      // Step 1: 이메일 입력
      const uniqueEmail = `verify-code-${Date.now()}@aaa.com`;
      await signupPage.emailInput.fill(uniqueEmail);
      await page.waitForTimeout(1000);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });

      // Step 2: 인증 코드 입력
      await signupPage.verificationCodeInput.fill('000000');
      await page.waitForTimeout(1000);
      await signupPage.verificationCompletedButton.click();

      // 비밀번호 입력 화면으로 이동 확인
      await expect(signupPage.passwordInput).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Step 3: Password Setup', () => {
    test('should display password input fields after verification', async ({ page }) => {
      // Step 1: 이메일 입력
      const uniqueEmail = `password-display-${Date.now()}@aaa.com`;
      await signupPage.emailInput.fill(uniqueEmail);
      await page.waitForTimeout(1000);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });

      // Step 2: 인증 코드 입력
      await signupPage.verificationCodeInput.fill('000000');
      await page.waitForTimeout(1000);
      await signupPage.verificationCompletedButton.click();
      await signupPage.passwordInput.waitFor({ state: 'visible', timeout: 10000 });

      // 비밀번호 입력 폼 확인
      await expect(signupPage.passwordInput).toBeVisible();
      await expect(signupPage.passwordConfirmInput).toBeVisible();
      await expect(signupPage.passwordNextButton).toBeVisible();
    });

    test('should proceed to terms step with matching passwords', async ({ page }) => {
      // Step 1: 이메일 입력
      const uniqueEmail = `password-submit-${Date.now()}@aaa.com`;
      await signupPage.emailInput.fill(uniqueEmail);
      await page.waitForTimeout(1000);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });

      // Step 2: 인증 코드 입력
      await signupPage.verificationCodeInput.fill('000000');
      await page.waitForTimeout(1000);
      await signupPage.verificationCompletedButton.click();
      await signupPage.passwordInput.waitFor({ state: 'visible', timeout: 10000 });

      // Step 3: 비밀번호 입력
      await signupPage.passwordInput.fill('qwer1234');
      await signupPage.passwordConfirmInput.fill('qwer1234');
      await page.waitForTimeout(500);
      await signupPage.passwordNextButton.click();

      // 약관 동의 화면으로 이동 확인
      await expect(signupPage.agreeAllCheckbox).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Step 4: Terms Agreement', () => {
    test('should display terms checkboxes after password setup', async ({ page }) => {
      // Step 1-3 진행
      const uniqueEmail = `terms-display-${Date.now()}@aaa.com`;
      await signupPage.emailInput.fill(uniqueEmail);
      await page.waitForTimeout(1000);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });

      await signupPage.verificationCodeInput.fill('000000');
      await page.waitForTimeout(1000);
      await signupPage.verificationCompletedButton.click();
      await signupPage.passwordInput.waitFor({ state: 'visible', timeout: 10000 });

      await signupPage.passwordInput.fill('qwer1234');
      await signupPage.passwordConfirmInput.fill('qwer1234');
      await page.waitForTimeout(500);
      await signupPage.passwordNextButton.click();
      await signupPage.agreeAllCheckbox.waitFor({ state: 'visible', timeout: 10000 });

      // 약관 동의 폼 확인
      await expect(signupPage.agreeAllCheckbox).toBeVisible();
      await expect(signupPage.termsNextButton).toBeVisible();
    });

    test('should enable submit button after agreeing to all terms', async ({ page }) => {
      // Step 1-3 진행
      const uniqueEmail = `terms-agree-${Date.now()}@aaa.com`;
      await signupPage.emailInput.fill(uniqueEmail);
      await page.waitForTimeout(1000);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });

      await signupPage.verificationCodeInput.fill('000000');
      await page.waitForTimeout(1000);
      await signupPage.verificationCompletedButton.click();
      await signupPage.passwordInput.waitFor({ state: 'visible', timeout: 10000 });

      await signupPage.passwordInput.fill('qwer1234');
      await signupPage.passwordConfirmInput.fill('qwer1234');
      await page.waitForTimeout(500);
      await signupPage.passwordNextButton.click();
      await signupPage.agreeAllCheckbox.waitFor({ state: 'visible', timeout: 10000 });

      // 전체 동의 클릭
      await signupPage.agreeAllCheckbox.click();
      await page.waitForTimeout(500);

      // 제출 버튼 활성화 확인
      await expect(signupPage.termsNextButton).toBeEnabled();
    });
  });

  test.describe('Full Signup Flow', () => {
    test('should complete full signup process with unique email', async ({ page }) => {
      // 유니크한 이메일 생성
      const uniqueEmail = `full-signup-${Date.now()}@aaa.com`;

      // Step 1: 이메일 입력
      await signupPage.emailInput.fill(uniqueEmail);
      await page.waitForTimeout(1000);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });

      // Step 2: 인증 코드 입력
      await signupPage.verificationCodeInput.fill('000000');
      await page.waitForTimeout(1000);
      await signupPage.verificationCompletedButton.click();
      await signupPage.passwordInput.waitFor({ state: 'visible', timeout: 10000 });

      // Step 3: 비밀번호 설정
      await signupPage.passwordInput.fill('qwer1234');
      await signupPage.passwordConfirmInput.fill('qwer1234');
      await page.waitForTimeout(500);
      await signupPage.passwordNextButton.click();
      await signupPage.agreeAllCheckbox.waitFor({ state: 'visible', timeout: 10000 });

      // Step 4: 약관 동의 및 가입 완료
      await signupPage.agreeAllCheckbox.click();
      await page.waitForTimeout(500);
      await signupPage.termsNextButton.click();

      // 가입 완료 확인 - Confirmation 버튼 대기
      const confirmButton = page.getByRole('button', { name: /Confirmation|확인/i });
      await expect(confirmButton).toBeVisible({ timeout: 15000 });

      // Confirmation 버튼 클릭
      await confirmButton.click();
      await page.waitForTimeout(2000);

      // 최종적으로 홈 또는 로그인 페이지로 이동 확인
      await expect(page).toHaveURL(/\/(home|login)/, { timeout: 10000 });
    });

    test('should use SignupPage helper for complete signup', async ({ page }) => {
      const uniqueEmail = `helper-signup-${Date.now()}@aaa.com`;

      // SignupPage의 completeSignup 헬퍼 사용
      await signupPage.completeSignup(uniqueEmail, 'qwer1234', '000000');

      // 가입 완료 후 홈 또는 로그인 페이지 확인
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(home|login)/);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate back to login page using browser back', async ({ page }) => {
      // 브라우저 뒤로가기로 로그인 페이지 이동 확인
      await page.goBack();
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });
  });
});
