import { test, expect } from '@playwright/test';
import { SignupPage } from '../../pages/SignupPage';

/**
 * 회원가입 Negative 테스트
 *
 * 잘못된 입력, 유효하지 않은 형식, 에러 시나리오 검증
 */
test.describe('회원가입 Negative 테스트', () => {
  let signupPage: SignupPage;

  test.beforeEach(async ({ page }) => {
    signupPage = new SignupPage(page);
    await signupPage.goto();
  });

  test.describe('Step 1: 이메일 형식 검증', () => {
    test('@ 없는 이메일은 next 버튼 비활성화', async () => {
      await signupPage.emailInput.fill('invalidemail.com');

      const isDisabled = await signupPage.emailNextButton.isDisabled();
      const ariaDisabled = await signupPage.emailNextButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ @ 없는 이메일: next 버튼 비활성화');
    });

    test('빈 이메일은 next 버튼 비활성화', async () => {
      await signupPage.emailInput.fill('');

      await expect(signupPage.emailNextButton).toBeDisabled();
      console.log('✅ 빈 이메일: next 버튼 비활성화');
    });

    test('도메인 없는 이메일 검증', async () => {
      await signupPage.emailInput.fill('test@');

      const isDisabled = await signupPage.emailNextButton.isDisabled();
      const ariaDisabled = await signupPage.emailNextButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 도메인 없는 이메일: next 버튼 비활성화');
    });

    test('공백 포함 이메일 검증', async () => {
      await signupPage.emailInput.fill('test @example.com');

      const isDisabled = await signupPage.emailNextButton.isDisabled();
      const ariaDisabled = await signupPage.emailNextButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 공백 포함 이메일: next 버튼 비활성화');
    });

    test('특수문자만 있는 이메일 검증', async () => {
      await signupPage.emailInput.fill('!#$%^&*');

      const isDisabled = await signupPage.emailNextButton.isDisabled();
      const ariaDisabled = await signupPage.emailNextButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 특수문자만 이메일: next 버튼 비활성화');
    });

    test('이중 @ 이메일 검증', async () => {
      await signupPage.emailInput.fill('test@@example.com');

      const isDisabled = await signupPage.emailNextButton.isDisabled();
      const ariaDisabled = await signupPage.emailNextButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 이중 @ 이메일: next 버튼 비활성화');
    });
  });

  test.describe('Step 2: 인증 코드 검증', () => {
    // Note: 인증 코드 테스트는 새 이메일 생성 필요, 별도 실행 권장
    test.skip('잘못된 인증 코드 입력 시 에러', async ({ page }) => {
      const uniqueEmail = `test-neg-${Date.now()}@aaa.com`;

      // Step 1: 이메일 입력
      await signupPage.emailInput.fill(uniqueEmail);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });

      // 잘못된 인증 코드 입력
      await signupPage.verificationCodeInput.fill('123456');
      await page.waitForTimeout(1000);

      // Verification completed 버튼 클릭 시도
      if (await signupPage.verificationCompletedButton.isEnabled()) {
        await signupPage.verificationCompletedButton.click();
        await page.waitForTimeout(2000);

        // 에러 메시지 또는 여전히 인증 코드 화면인지 확인
        const stillOnVerification = await signupPage.verificationCodeInput.isVisible();
        const errorMessage = page.getByText(/invalid|incorrect|wrong|error|잘못|실패/i);
        const hasError = await errorMessage.isVisible().catch(() => false);

        expect(stillOnVerification || hasError).toBeTruthy();
        console.log('✅ 잘못된 인증 코드: 에러 또는 화면 유지');
      }
    });

    test.skip('빈 인증 코드는 버튼 비활성화', async ({ page }) => {
      const uniqueEmail = `test-neg-${Date.now()}@aaa.com`;

      await signupPage.emailInput.fill(uniqueEmail);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });

      // 빈 인증 코드
      await signupPage.verificationCodeInput.fill('');

      const isDisabled = await signupPage.verificationCompletedButton.isDisabled();
      const ariaDisabled = await signupPage.verificationCompletedButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 빈 인증 코드: 버튼 비활성화');
    });

    test.skip('5자리 인증 코드 검증 (6자리 필요)', async ({ page }) => {
      const uniqueEmail = `test-neg-${Date.now()}@aaa.com`;

      await signupPage.emailInput.fill(uniqueEmail);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });

      // 5자리만 입력
      await signupPage.verificationCodeInput.fill('12345');

      const isDisabled = await signupPage.verificationCompletedButton.isDisabled();
      const ariaDisabled = await signupPage.verificationCompletedButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 5자리 인증 코드: 버튼 비활성화');
    });
  });

  test.describe('Step 3: 비밀번호 검증', () => {
    // Note: 비밀번호 검증 테스트는 새 계정 생성 필요, 별도 실행 권장
    test.skip('비밀번호 불일치 검증', async ({ page }) => {
      const uniqueEmail = `test-neg-${Date.now()}@aaa.com`;

      // Step 1 & 2
      await signupPage.emailInput.fill(uniqueEmail);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });
      await signupPage.verificationCodeInput.fill('000000');
      await signupPage.verificationCompletedButton.click();
      await signupPage.passwordInput.waitFor({ state: 'visible', timeout: 15000 });

      // 비밀번호 불일치 입력
      await signupPage.passwordInput.fill('qwer1234');
      await signupPage.passwordConfirmInput.fill('different123');
      await page.waitForTimeout(500);

      // 버튼 비활성화 또는 에러 메시지 확인
      const isDisabled = await signupPage.passwordNextButton.isDisabled();
      const ariaDisabled = await signupPage.passwordNextButton.getAttribute('aria-disabled');
      const errorMessage = page.getByText(/match|일치|같지/i);
      const hasError = await errorMessage.isVisible().catch(() => false);

      expect(isDisabled || ariaDisabled === 'true' || hasError).toBeTruthy();
      console.log('✅ 비밀번호 불일치: 에러 또는 버튼 비활성화');
    });

    test.skip('빈 비밀번호 검증', async ({ page }) => {
      const uniqueEmail = `test-neg-${Date.now()}@aaa.com`;

      // Step 1 & 2
      await signupPage.emailInput.fill(uniqueEmail);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });
      await signupPage.verificationCodeInput.fill('000000');
      await signupPage.verificationCompletedButton.click();
      await signupPage.passwordInput.waitFor({ state: 'visible', timeout: 15000 });

      // 빈 비밀번호
      await signupPage.passwordInput.fill('');
      await signupPage.passwordConfirmInput.fill('');

      await expect(signupPage.passwordNextButton).toBeDisabled();
      console.log('✅ 빈 비밀번호: 버튼 비활성화');
    });

    test.skip('짧은 비밀번호 검증 (8자 미만)', async ({ page }) => {
      const uniqueEmail = `test-neg-${Date.now()}@aaa.com`;

      // Step 1 & 2
      await signupPage.emailInput.fill(uniqueEmail);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });
      await signupPage.verificationCodeInput.fill('000000');
      await signupPage.verificationCompletedButton.click();
      await signupPage.passwordInput.waitFor({ state: 'visible', timeout: 15000 });

      // 짧은 비밀번호
      await signupPage.passwordInput.fill('abc');
      await signupPage.passwordConfirmInput.fill('abc');
      await page.waitForTimeout(500);

      const isDisabled = await signupPage.passwordNextButton.isDisabled();
      const ariaDisabled = await signupPage.passwordNextButton.getAttribute('aria-disabled');
      const errorMessage = page.getByText(/short|length|자리|8|최소/i);
      const hasError = await errorMessage.isVisible().catch(() => false);

      expect(isDisabled || ariaDisabled === 'true' || hasError).toBeTruthy();
      console.log('✅ 짧은 비밀번호: 에러 또는 버튼 비활성화');
    });
  });

  test.describe('Step 4: 약관 동의 검증', () => {
    // Note: 약관 검증 테스트는 새 계정 생성 필요, 별도 실행 권장
    test.skip('약관 미동의 시 Next 버튼 비활성화', async ({ page }) => {
      const uniqueEmail = `test-neg-${Date.now()}@aaa.com`;

      // Step 1, 2, 3 완료
      await signupPage.emailInput.fill(uniqueEmail);
      await signupPage.emailNextButton.click({ force: true });
      await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });
      await signupPage.verificationCodeInput.fill('000000');
      await signupPage.verificationCompletedButton.click();
      await signupPage.passwordInput.waitFor({ state: 'visible', timeout: 15000 });
      await signupPage.passwordInput.fill('qwer1234');
      await signupPage.passwordConfirmInput.fill('qwer1234');
      await signupPage.passwordNextButton.click();
      await signupPage.agreeAllCheckbox.waitFor({ state: 'visible', timeout: 15000 });

      // 약관 동의 없이 Next 버튼 확인
      const isDisabled = await signupPage.termsNextButton.isDisabled();
      const ariaDisabled = await signupPage.termsNextButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 약관 미동의: Next 버튼 비활성화');
    });
  });
});
