import { test, expect } from '@playwright/test';

/**
 * Example E2E Test Spec
 *
 * This is a sample test file to demonstrate the structure.
 * Run with: npx playwright test
 */

test.describe('Example Tests', () => {
  test('should load the homepage', async ({ page }) => {
    // Navigate to the base URL
    await page.goto('/');

    // Verify the page loaded
    await expect(page).toHaveTitle(/.*/);
  });

  test('should have interactive elements', async ({ page }) => {
    await page.goto('/');

    // Example: Check for navigation
    const nav = page.locator('nav');
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();
    }
  });
});

test.describe('Form Interactions', () => {
  test.skip('should submit a form successfully', async ({ page }) => {
    // This test is skipped - implement when you have a form page
    await page.goto('/contact');

    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Thank you')).toBeVisible();
  });
});
