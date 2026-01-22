import { test, expect } from '@playwright/test';

/**
 * 의도적으로 깨진 셀렉터를 사용한 테스트
 * Self-Healing 기능 테스트용
 */
test.describe('Login Page - Broken Selectors', () => {
  test.skip('should fill login form with broken selectors', async ({ page }) => {
    await page.goto('/login');

    // 깨진 셀렉터들 - 실제로는 #email, #password 사용해야 함
    await page.locator('#user-email-input').fill('test@example.com');
    await page.locator('#user-password-input').fill('password123');

    // 깨진 버튼 셀렉터
    await page.locator('button.submit-login-btn').click();
  });
});
