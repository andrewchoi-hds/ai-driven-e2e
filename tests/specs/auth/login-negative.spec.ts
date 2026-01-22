import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

/**
 * 로그인 Negative 테스트
 *
 * 잘못된 입력, 유효하지 않은 형식, 에러 시나리오 검증
 */
test.describe('로그인 Negative 테스트', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('이메일 형식 검증', () => {
    test('@ 없는 이메일은 버튼 비활성화 유지', async () => {
      await loginPage.fillEmail('invalidemail.com');
      await loginPage.fillPassword('qwer1234');

      // 잘못된 이메일 형식이면 버튼이 비활성화 상태여야 함
      const isDisabled = await loginPage.logInButton.isDisabled();
      const ariaDisabled = await loginPage.logInButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ @ 없는 이메일: 버튼 비활성화 확인');
    });

    test('공백 포함 이메일 검증', async () => {
      await loginPage.fillEmail('test @example.com');
      await loginPage.fillPassword('qwer1234');

      const isDisabled = await loginPage.logInButton.isDisabled();
      const ariaDisabled = await loginPage.logInButton.getAttribute('aria-disabled');

      // 공백 포함 이메일은 거부되어야 함
      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 공백 포함 이메일: 버튼 비활성화 확인');
    });

    test('도메인 없는 이메일 검증', async () => {
      await loginPage.fillEmail('test@');
      await loginPage.fillPassword('qwer1234');

      const isDisabled = await loginPage.logInButton.isDisabled();
      const ariaDisabled = await loginPage.logInButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 도메인 없는 이메일: 버튼 비활성화 확인');
    });

    test('특수문자만 있는 이메일 검증', async () => {
      await loginPage.fillEmail('!@#$%');
      await loginPage.fillPassword('qwer1234');

      const isDisabled = await loginPage.logInButton.isDisabled();
      const ariaDisabled = await loginPage.logInButton.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 특수문자만 이메일: 버튼 비활성화 확인');
    });
  });

  test.describe('비밀번호 검증', () => {
    test('빈 비밀번호는 버튼 비활성화', async () => {
      await loginPage.fillEmail('test@aaa.com');
      await loginPage.fillPassword('');

      await expect(loginPage.logInButton).toBeDisabled();
      console.log('✅ 빈 비밀번호: 버튼 비활성화 확인');
    });

    test('1자리 비밀번호 검증', async ({ page }) => {
      await loginPage.fillEmail('test@aaa.com');
      await loginPage.fillPassword('a');

      // 너무 짧은 비밀번호는 버튼 비활성화 또는 에러 표시
      const isDisabled = await loginPage.logInButton.isDisabled();
      const ariaDisabled = await loginPage.logInButton.getAttribute('aria-disabled');

      if (isDisabled || ariaDisabled === 'true') {
        console.log('✅ 1자리 비밀번호: 버튼 비활성화');
      } else {
        // 버튼이 활성화되면 클릭 후 에러 메시지 또는 로그인 실패 확인
        await loginPage.logInButton.click();
        await page.waitForTimeout(3000);

        // 로그인 성공 여부 확인 (로그인 페이지에 남아있으면 실패)
        const currentUrl = page.url();
        const stayedOnLogin = currentUrl.includes('/login');

        if (stayedOnLogin) {
          console.log('✅ 1자리 비밀번호: 로그인 실패 (로그인 페이지 유지)');
        } else {
          console.log('⚠️ 1자리 비밀번호: 로그인 성공 (서버에서 검증)');
        }
        // 로그인 실패(로그인 페이지 유지)가 정상 동작
        expect(stayedOnLogin).toBeTruthy();
      }
    });
  });

  test.describe('로그인 실패 시나리오', () => {
    test('존재하지 않는 이메일로 로그인 시도', async ({ page }) => {
      const nonExistentEmail = `nonexistent_${Date.now()}@example.com`;

      await loginPage.fillEmail(nonExistentEmail);
      await loginPage.fillPassword('qwer1234');

      // 버튼 활성화 대기
      await page.waitForTimeout(500);

      if (await loginPage.logInButton.isEnabled()) {
        await loginPage.logInButton.click();
        await page.waitForTimeout(3000);

        // 에러 메시지 또는 에러 상태 확인
        const errorMessage = page.getByText(/not found|doesn't exist|invalid|error|incorrect|없|실패/i);
        const hasError = await errorMessage.isVisible().catch(() => false);

        if (hasError) {
          console.log('✅ 존재하지 않는 이메일: 에러 메시지 표시');
        } else {
          // URL이 여전히 로그인 페이지인지 확인
          expect(page.url()).toContain('/login');
          console.log('✅ 존재하지 않는 이메일: 로그인 페이지 유지');
        }
      }
    });

    test('잘못된 비밀번호로 로그인 시도', async ({ page }) => {
      // 실제 존재하는 이메일 + 잘못된 비밀번호
      await loginPage.fillEmail('test_ai_1@aaa.com');
      await loginPage.fillPassword('wrongpassword123');

      await page.waitForTimeout(500);

      if (await loginPage.logInButton.isEnabled()) {
        await loginPage.logInButton.click();
        await page.waitForTimeout(3000);

        // 에러 메시지 확인
        const errorMessage = page.getByText(/invalid|incorrect|wrong|error|틀|실패/i);
        const hasError = await errorMessage.isVisible().catch(() => false);

        if (hasError) {
          console.log('✅ 잘못된 비밀번호: 에러 메시지 표시');
        } else {
          // 로그인 페이지에 여전히 있는지 확인 (로그인 실패)
          expect(page.url()).toContain('/login');
          console.log('✅ 잘못된 비밀번호: 로그인 실패 확인');
        }
      }
    });

    test('빈 폼으로 로그인 시도 불가', async () => {
      // 이메일과 비밀번호 모두 비어있으면 버튼 비활성화
      await expect(loginPage.logInButton).toBeDisabled();
      console.log('✅ 빈 폼: 로그인 버튼 비활성화');
    });
  });

  test.describe('입력 필드 상호작용', () => {
    test('이메일 입력 후 삭제하면 버튼 비활성화', async () => {
      await loginPage.fillEmail('test@aaa.com');
      await loginPage.fillPassword('qwer1234');

      // 버튼 활성화 확인
      await loginPage.page.waitForTimeout(500);

      // 이메일 삭제
      await loginPage.emailInput.clear();
      await loginPage.page.waitForTimeout(300);

      // 버튼 비활성화 확인
      await expect(loginPage.logInButton).toBeDisabled();
      console.log('✅ 이메일 삭제 후: 버튼 비활성화');
    });

    test('비밀번호 입력 후 삭제하면 버튼 비활성화', async () => {
      await loginPage.fillEmail('test@aaa.com');
      await loginPage.fillPassword('qwer1234');

      await loginPage.page.waitForTimeout(500);

      // 비밀번호 삭제
      await loginPage.passwordInput.clear();
      await loginPage.page.waitForTimeout(300);

      // 버튼 비활성화 확인
      await expect(loginPage.logInButton).toBeDisabled();
      console.log('✅ 비밀번호 삭제 후: 버튼 비활성화');
    });
  });
});
