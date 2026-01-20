import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form elements', async () => {
    await loginPage.expectToBeVisible();
  });

  test('should have disabled login button when form is empty', async () => {
    // 폼이 비어있으면 로그인 버튼이 비활성화되어 있어야 함
    await expect(loginPage.logInButton).toBeDisabled();
  });

  test('should enable login button after filling form', async () => {
    await loginPage.fillEmail('test@example.com');
    await loginPage.fillPassword('password123');
    await expect(loginPage.logInButton).toBeEnabled();
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.login('invalid@example.com', 'wrongpassword');
    // 에러 메시지 확인 (실제 메시지에 맞게 수정 필요)
    await expect(loginPage.page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to sign up page', async ({ page }) => {
    await loginPage.clickSignUp();
    await expect(page).toHaveURL(/signup/);
  });

  test('should navigate to find password page', async ({ page }) => {
    await loginPage.clickFindPassword();
    await expect(page).toHaveURL(/password/);
  });
});
