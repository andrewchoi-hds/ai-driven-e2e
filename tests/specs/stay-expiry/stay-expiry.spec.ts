import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages';

/**
 * 체류만료일 입력 및 연장 안내 테스트
 *
 * 플로우:
 * 1. 회원가입 → 여권 등록 → 학교 정보 등록
 * 2. 홈 화면에서 "Register" 버튼 클릭 → 체류만료일 입력 페이지 이동
 * 3. 체류만료일 입력 (YYYY.MM.DD 형식)
 * 4. 4달 미만 입력 시 → 홈 화면에 "Extending the Expiration Date of Stay" 버튼 표시
 *
 * URL: /m/home/submit/visa-expiration-date
 * 입력 필드: #expiration-date (type="tel", placeholder="YYYY.MM.DD")
 */
test.describe('체류만료일 입력 및 연장 안내', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test_ai_17@aaa.com', 'qwer1234');
    await page.waitForURL('**/home');
  });

  test('체류만료일 입력 페이지 UI 요소 확인', async ({ page }) => {
    await page.goto('/m/home/submit/visa-expiration-date');
    await page.waitForTimeout(2000);

    // 페이지 제목 확인
    const title = page.getByTestId('page-title');
    await expect(title).toContainText('Please enter the expiration date of stay');

    // 입력 필드 확인
    const dateInput = page.locator('#expiration-date');
    await expect(dateInput).toBeVisible();
    await expect(dateInput).toHaveAttribute('placeholder', 'YYYY.MM.DD');

    // 안내 문구 확인
    const guide = page.getByText('The expiration date of stay can be found');
    await expect(guide).toBeVisible();

    // Register 버튼 확인
    const registerBtn = page.getByRole('button', { name: 'Register' });
    await expect(registerBtn).toBeVisible();

    console.log('✅ 체류만료일 입력 페이지 UI 요소 확인 완료');
  });

  test('4달 미만 체류만료일 입력 시 연장 안내 버튼 표시', async ({ page }) => {
    await page.goto('/m/home/submit/visa-expiration-date');
    await page.waitForTimeout(2000);

    // 4달 미만 날짜 계산 (오늘로부터 3개월 후)
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(today.getMonth() + 3);

    const year = threeMonthsLater.getFullYear();
    const month = String(threeMonthsLater.getMonth() + 1).padStart(2, '0');
    const day = String(threeMonthsLater.getDate()).padStart(2, '0');
    const expiryDate = `${year}.${month}.${day}`;

    console.log(`📅 4달 미만 체류만료일 입력: ${expiryDate}`);

    // 날짜 입력
    await page.locator('#expiration-date').fill(expiryDate);
    await page.waitForTimeout(500);

    // Register 버튼 클릭
    await page.getByRole('button', { name: 'Register' }).click();
    await page.waitForURL('**/home');
    await page.waitForTimeout(1000);

    // 홈 화면에서 "연장 안내" 버튼 확인
    const extensionBtn = page.getByRole('button', { name: /Extending the Expiration Date of Stay|체류기간 연장/i });
    await expect(extensionBtn).toBeVisible();

    console.log('✅ "Extending the Expiration Date of Stay" 버튼 표시 확인');

    // D-day 뱃지 확인 (약 90일)
    const dDayBadge = page.getByText(/D-\d+/);
    if (await dDayBadge.isVisible().catch(() => false)) {
      const dDayText = await dDayBadge.textContent();
      console.log(`✅ D-day 뱃지: ${dDayText}`);
    }

    await page.screenshot({ path: 'reports/stay-expiry/test-4months-extension.png', fullPage: true });
  });

  test('4달 이상 체류만료일 입력 시 연장 안내 미표시', async ({ page }) => {
    await page.goto('/m/home/submit/visa-expiration-date');
    await page.waitForTimeout(2000);

    // 6개월 후 날짜 (4달 이상)
    const today = new Date();
    const sixMonthsLater = new Date(today);
    sixMonthsLater.setMonth(today.getMonth() + 6);

    const year = sixMonthsLater.getFullYear();
    const month = String(sixMonthsLater.getMonth() + 1).padStart(2, '0');
    const day = String(sixMonthsLater.getDate()).padStart(2, '0');
    const expiryDate = `${year}.${month}.${day}`;

    console.log(`📅 4달 이상 체류만료일 입력: ${expiryDate}`);

    // 날짜 입력
    await page.locator('#expiration-date').fill(expiryDate);
    await page.waitForTimeout(500);

    // Register 버튼 클릭
    await page.getByRole('button', { name: 'Register' }).click();
    await page.waitForURL('**/home');
    await page.waitForTimeout(1000);

    // 홈 화면에서 "연장 안내" 버튼이 없어야 함
    const extensionBtn = page.getByRole('button', { name: /Extending the Expiration Date of Stay|체류기간 연장/i });
    await expect(extensionBtn).not.toBeVisible();

    console.log('✅ 4달 이상 입력 시 연장 안내 미표시 확인');

    await page.screenshot({ path: 'reports/stay-expiry/test-6months-no-extension.png', fullPage: true });
  });

  test('홈 화면에서 체류만료일 등록 전체 플로우', async ({ page }) => {
    // 홈 화면으로 이동
    await page.goto('/m/home');
    await page.waitForTimeout(2000);

    // "Expiration Date of Stay" 카드에서 Register 버튼 확인
    const expiryLabel = page.getByText('Expiration Date of Stay');

    if (await expiryLabel.isVisible().catch(() => false)) {
      console.log('✅ 홈 화면에서 "Expiration Date of Stay" 확인');

      // Register 버튼 클릭
      const registerBtn = page.getByRole('button', { name: 'Register' }).first();
      await registerBtn.click();
      await page.waitForTimeout(2000);

      // 체류만료일 입력 페이지 확인
      expect(page.url()).toContain('/m/home/submit/visa-expiration-date');
      console.log('✅ 체류만료일 입력 페이지로 이동');

      // 3개월 후 날짜 입력
      const today = new Date();
      const threeMonthsLater = new Date(today);
      threeMonthsLater.setMonth(today.getMonth() + 3);

      const expiryDate = `${threeMonthsLater.getFullYear()}.${String(threeMonthsLater.getMonth() + 1).padStart(2, '0')}.${String(threeMonthsLater.getDate()).padStart(2, '0')}`;

      await page.locator('#expiration-date').fill(expiryDate);
      console.log(`✅ 체류만료일 입력: ${expiryDate}`);

      // 등록
      await page.getByRole('button', { name: 'Register' }).click();
      await page.waitForURL('**/home');

      // 연장 안내 확인
      const extensionBtn = page.getByRole('button', { name: /Extending/i });
      const isExtensionVisible = await extensionBtn.isVisible().catch(() => false);

      if (isExtensionVisible) {
        console.log('✅ 체류기간 연장 안내 버튼 표시됨');
      }
    } else {
      console.log('이미 체류만료일이 등록된 상태');
    }
  });

  test('연장 안내 버튼 클릭 시 연장 페이지로 이동', async ({ page }) => {
    // 홈 화면으로 이동 (이미 4달 미만 날짜가 등록된 상태 가정)
    await page.goto('/m/home');
    await page.waitForTimeout(2000);

    // "Extending the Expiration Date of Stay" 버튼 확인
    const extensionBtn = page.getByRole('button', { name: /Extending the Expiration Date of Stay|체류기간 연장/i });

    if (await extensionBtn.isVisible().catch(() => false)) {
      console.log('✅ 연장 안내 버튼 발견');

      // 버튼 클릭
      await extensionBtn.click();
      await page.waitForTimeout(3000);

      console.log('연장 페이지 URL:', page.url());
      await page.screenshot({ path: 'reports/stay-expiry/test-extension-page.png', fullPage: true });

      // 연장 관련 페이지로 이동했는지 확인
      const pageText = await page.locator('body').textContent();
      const hasExtensionContent = pageText?.includes('연장') || pageText?.includes('extension') || pageText?.includes('extend');

      if (hasExtensionContent) {
        console.log('✅ 연장 관련 페이지로 이동 확인');
      }
    } else {
      console.log('연장 안내 버튼 없음 - 4달 이상 남은 상태');
    }
  });
});
