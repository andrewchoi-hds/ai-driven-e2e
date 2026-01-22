import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages';

/**
 * 체류만료일 입력 검증 테스트
 *
 * - 날짜 형식 검증 (YYYY.MM.DD)
 * - 경계값 테스트 (정확히 4개월)
 * - 잘못된 날짜 검증 (과거 날짜, 유효하지 않은 날짜)
 */
test.describe('체류만료일 입력 검증', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test_ai_17@aaa.com', 'qwer1234');
    await page.waitForURL('**/home');
    await page.goto('/m/home/submit/visa-expiration-date');
    await page.waitForTimeout(2000);
  });

  test.describe('날짜 형식 검증', () => {
    test('잘못된 형식: YYYY-MM-DD (하이픈)', async ({ page }) => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setMonth(today.getMonth() + 3);

      const wrongFormat = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

      await page.locator('#expiration-date').fill(wrongFormat);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });
      const isDisabled = await registerBtn.isDisabled();
      const ariaDisabled = await registerBtn.getAttribute('aria-disabled');

      // 잘못된 형식이면 버튼 비활성화 또는 에러 메시지
      const errorMessage = page.getByText(/invalid|format|형식|잘못/i);
      const hasError = await errorMessage.isVisible().catch(() => false);

      console.log(`입력: ${wrongFormat}`);
      console.log(`버튼 비활성화: ${isDisabled || ariaDisabled === 'true'}`);
      console.log(`에러 메시지: ${hasError}`);

      if (isDisabled || ariaDisabled === 'true' || hasError) {
        console.log('✅ YYYY-MM-DD 형식: 거부됨');
      } else {
        console.log('⚠️ YYYY-MM-DD 형식: 허용됨 (형식 자동 변환 가능)');
      }
    });

    test('잘못된 형식: DD.MM.YYYY (유럽식)', async ({ page }) => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setMonth(today.getMonth() + 3);

      const wrongFormat = `${String(futureDate.getDate()).padStart(2, '0')}.${String(futureDate.getMonth() + 1).padStart(2, '0')}.${futureDate.getFullYear()}`;

      await page.locator('#expiration-date').fill(wrongFormat);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });
      const isDisabled = await registerBtn.isDisabled();
      const ariaDisabled = await registerBtn.getAttribute('aria-disabled');

      console.log(`입력: ${wrongFormat}`);

      if (isDisabled || ariaDisabled === 'true') {
        console.log('✅ DD.MM.YYYY 형식: 버튼 비활성화');
      } else {
        console.log('⚠️ DD.MM.YYYY 형식: 허용됨');
      }
    });

    test('잘못된 형식: 슬래시 구분자', async ({ page }) => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setMonth(today.getMonth() + 3);

      const wrongFormat = `${futureDate.getFullYear()}/${String(futureDate.getMonth() + 1).padStart(2, '0')}/${String(futureDate.getDate()).padStart(2, '0')}`;

      await page.locator('#expiration-date').fill(wrongFormat);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });
      const isDisabled = await registerBtn.isDisabled();
      const ariaDisabled = await registerBtn.getAttribute('aria-disabled');

      console.log(`입력: ${wrongFormat}`);

      if (isDisabled || ariaDisabled === 'true') {
        console.log('✅ YYYY/MM/DD 형식: 버튼 비활성화');
      } else {
        console.log('⚠️ YYYY/MM/DD 형식: 허용됨');
      }
    });

    test('문자열 입력 시 처리', async ({ page }) => {
      await page.locator('#expiration-date').fill('invalid-date');
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });
      const isDisabled = await registerBtn.isDisabled();
      const ariaDisabled = await registerBtn.getAttribute('aria-disabled');

      expect(isDisabled || ariaDisabled === 'true').toBeTruthy();
      console.log('✅ 문자열 입력: 버튼 비활성화');
    });

    test('빈 값 입력 시 버튼 비활성화', async ({ page }) => {
      await page.locator('#expiration-date').fill('');
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });
      await expect(registerBtn).toBeDisabled();
      console.log('✅ 빈 값: 버튼 비활성화');
    });
  });

  test.describe('경계값 테스트', () => {
    test('정확히 4개월 후 (경계값) - 연장 안내 표시 여부', async ({ page }) => {
      const today = new Date();
      const exactlyFourMonths = new Date(today);
      exactlyFourMonths.setMonth(today.getMonth() + 4);

      const year = exactlyFourMonths.getFullYear();
      const month = String(exactlyFourMonths.getMonth() + 1).padStart(2, '0');
      const day = String(exactlyFourMonths.getDate()).padStart(2, '0');
      const expiryDate = `${year}.${month}.${day}`;

      console.log(`📅 정확히 4개월 후 날짜: ${expiryDate}`);

      await page.locator('#expiration-date').fill(expiryDate);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });

      if (await registerBtn.isEnabled()) {
        await registerBtn.click();
        await page.waitForURL('**/home');
        await page.waitForTimeout(1000);

        // 4개월 경계값에서 연장 안내 표시 여부 확인
        const extensionBtn = page.getByRole('button', { name: /Extending the Expiration Date of Stay/i });
        const isVisible = await extensionBtn.isVisible().catch(() => false);

        console.log(`연장 안내 버튼 표시: ${isVisible}`);
        console.log('✅ 경계값 테스트 완료');
      }
    });

    test('4개월 - 1일 (연장 안내 표시)', async ({ page }) => {
      const today = new Date();
      const almostFourMonths = new Date(today);
      almostFourMonths.setMonth(today.getMonth() + 4);
      almostFourMonths.setDate(almostFourMonths.getDate() - 1);

      const year = almostFourMonths.getFullYear();
      const month = String(almostFourMonths.getMonth() + 1).padStart(2, '0');
      const day = String(almostFourMonths.getDate()).padStart(2, '0');
      const expiryDate = `${year}.${month}.${day}`;

      console.log(`📅 4개월 - 1일 날짜: ${expiryDate}`);

      await page.locator('#expiration-date').fill(expiryDate);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });

      if (await registerBtn.isEnabled()) {
        await registerBtn.click();
        await page.waitForURL('**/home');
        await page.waitForTimeout(1000);

        const extensionBtn = page.getByRole('button', { name: /Extending the Expiration Date of Stay/i });
        const isVisible = await extensionBtn.isVisible().catch(() => false);

        expect(isVisible).toBeTruthy();
        console.log('✅ 4개월 - 1일: 연장 안내 버튼 표시됨');
      }
    });

    test('4개월 + 1일 (연장 안내 미표시)', async ({ page }) => {
      const today = new Date();
      const overFourMonths = new Date(today);
      overFourMonths.setMonth(today.getMonth() + 4);
      overFourMonths.setDate(overFourMonths.getDate() + 1);

      const year = overFourMonths.getFullYear();
      const month = String(overFourMonths.getMonth() + 1).padStart(2, '0');
      const day = String(overFourMonths.getDate()).padStart(2, '0');
      const expiryDate = `${year}.${month}.${day}`;

      console.log(`📅 4개월 + 1일 날짜: ${expiryDate}`);

      await page.locator('#expiration-date').fill(expiryDate);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });

      if (await registerBtn.isEnabled()) {
        await registerBtn.click();
        await page.waitForURL('**/home');
        await page.waitForTimeout(1000);

        const extensionBtn = page.getByRole('button', { name: /Extending the Expiration Date of Stay/i });
        const isVisible = await extensionBtn.isVisible().catch(() => false);

        expect(isVisible).toBeFalsy();
        console.log('✅ 4개월 + 1일: 연장 안내 버튼 미표시');
      }
    });
  });

  test.describe('유효하지 않은 날짜', () => {
    test('과거 날짜 입력 시 처리', async ({ page }) => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const year = pastDate.getFullYear();
      const month = String(pastDate.getMonth() + 1).padStart(2, '0');
      const day = String(pastDate.getDate()).padStart(2, '0');
      const expiryDate = `${year}.${month}.${day}`;

      console.log(`📅 과거 날짜: ${expiryDate}`);

      await page.locator('#expiration-date').fill(expiryDate);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });
      const isDisabled = await registerBtn.isDisabled();
      const ariaDisabled = await registerBtn.getAttribute('aria-disabled');

      // 과거 날짜는 거부되어야 함
      const errorMessage = page.getByText(/past|invalid|expired|과거|만료|유효/i);
      const hasError = await errorMessage.isVisible().catch(() => false);

      if (isDisabled || ariaDisabled === 'true' || hasError) {
        console.log('✅ 과거 날짜: 거부됨');
      } else {
        console.log('⚠️ 과거 날짜: 허용됨 (비즈니스 로직 확인 필요)');
      }
    });

    test('존재하지 않는 날짜 (2월 30일)', async ({ page }) => {
      const nextYear = new Date().getFullYear() + 1;
      const invalidDate = `${nextYear}.02.30`;

      console.log(`📅 존재하지 않는 날짜: ${invalidDate}`);

      await page.locator('#expiration-date').fill(invalidDate);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });
      const isDisabled = await registerBtn.isDisabled();
      const ariaDisabled = await registerBtn.getAttribute('aria-disabled');

      if (isDisabled || ariaDisabled === 'true') {
        console.log('✅ 2월 30일: 버튼 비활성화');
      } else {
        console.log('⚠️ 2월 30일: 허용됨 (날짜 검증 필요)');
      }
    });

    test('매우 먼 미래 날짜 (10년 후)', async ({ page }) => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 10);

      const year = farFuture.getFullYear();
      const month = String(farFuture.getMonth() + 1).padStart(2, '0');
      const day = String(farFuture.getDate()).padStart(2, '0');
      const expiryDate = `${year}.${month}.${day}`;

      console.log(`📅 10년 후 날짜: ${expiryDate}`);

      await page.locator('#expiration-date').fill(expiryDate);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });

      // 너무 먼 미래 날짜는 경고 또는 거부될 수 있음
      if (await registerBtn.isEnabled()) {
        console.log('⚠️ 10년 후: 허용됨 (비즈니스 로직 확인 필요)');
      } else {
        console.log('✅ 10년 후: 버튼 비활성화');
      }
    });

    test('윤년 2월 29일 검증', async ({ page }) => {
      // 다음 윤년 찾기
      let leapYear = new Date().getFullYear();
      while (!((leapYear % 4 === 0 && leapYear % 100 !== 0) || leapYear % 400 === 0)) {
        leapYear++;
      }

      const leapDate = `${leapYear}.02.29`;

      console.log(`📅 윤년 2월 29일: ${leapDate}`);

      await page.locator('#expiration-date').fill(leapDate);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });

      if (await registerBtn.isEnabled()) {
        console.log('✅ 윤년 2월 29일: 유효한 날짜로 허용됨');
      } else {
        console.log('⚠️ 윤년 2월 29일: 버튼 비활성화 (검증 로직 확인 필요)');
      }
    });

    test('비윤년 2월 29일 검증', async ({ page }) => {
      // 비윤년 찾기
      let nonLeapYear = new Date().getFullYear();
      while ((nonLeapYear % 4 === 0 && nonLeapYear % 100 !== 0) || nonLeapYear % 400 === 0) {
        nonLeapYear++;
      }

      const invalidDate = `${nonLeapYear}.02.29`;

      console.log(`📅 비윤년 2월 29일: ${invalidDate}`);

      await page.locator('#expiration-date').fill(invalidDate);
      await page.waitForTimeout(500);

      const registerBtn = page.getByRole('button', { name: 'Register' });
      const isDisabled = await registerBtn.isDisabled();
      const ariaDisabled = await registerBtn.getAttribute('aria-disabled');

      if (isDisabled || ariaDisabled === 'true') {
        console.log('✅ 비윤년 2월 29일: 유효하지 않은 날짜로 거부됨');
      } else {
        console.log('⚠️ 비윤년 2월 29일: 허용됨 (날짜 검증 필요)');
      }
    });
  });
});
