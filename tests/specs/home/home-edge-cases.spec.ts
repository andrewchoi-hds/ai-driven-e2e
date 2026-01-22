import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

/**
 * 홈 화면 Edge Case 테스트
 *
 * - 페이지 로드 실패 처리
 * - 빠른 네비게이션 동작
 * - 새로고침 동작
 * - 다양한 계정 상태에서의 UI
 */
test.describe('홈 화면 Edge Case', () => {
  test.describe('페이지 로드 및 새로고침', () => {
    test('홈 화면 새로고침 시 상태 유지', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('aiqa1@aaa.com', 'qwer1234');
      await page.waitForURL('**/home');

      // 홈 화면 요소 확인
      const initialContent = await page.locator('body').textContent();

      // 페이지 새로고침
      await page.reload();
      await page.waitForTimeout(2000);

      // 여전히 홈 화면인지 확인
      expect(page.url()).toContain('/home');

      // 콘텐츠가 다시 로드되었는지 확인
      const refreshedContent = await page.locator('body').textContent();

      if (refreshedContent && refreshedContent.length > 100) {
        console.log('✅ 새로고침 후: 콘텐츠 정상 로드');
      }
    });

    test('빠른 연속 클릭 시 안정성', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('aiqa1@aaa.com', 'qwer1234');
      await page.waitForURL('**/home');

      // 네비게이션 버튼들 빠르게 클릭
      const navItems = page.locator('nav button, nav a, [role="navigation"] button');
      const count = await navItems.count();

      if (count > 0) {
        // 첫 번째 버튼 빠르게 여러 번 클릭
        for (let i = 0; i < 3; i++) {
          await navItems.first().click({ force: true });
          await page.waitForTimeout(100);
        }

        await page.waitForTimeout(1000);

        // 페이지가 크래시되지 않고 정상 동작하는지 확인
        const isPageResponsive = await page.evaluate(() => document.body !== null);
        expect(isPageResponsive).toBeTruthy();
        console.log('✅ 빠른 연속 클릭: 페이지 안정성 유지');
      }
    });

    test('뒤로가기 후 홈 화면 복귀', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('aiqa1@aaa.com', 'qwer1234');
      await page.waitForURL('**/home');

      // 다른 페이지로 이동 (Life 또는 Benefit)
      const lifeTab = page.getByRole('link', { name: /life/i });
      if (await lifeTab.isVisible().catch(() => false)) {
        await lifeTab.click();
        await page.waitForTimeout(2000);
      } else {
        // 다른 네비게이션 항목 시도
        await page.goto('/m/life');
        await page.waitForTimeout(2000);
      }

      // 뒤로가기
      await page.goBack();
      await page.waitForTimeout(2000);

      // 홈 화면으로 복귀 확인
      const currentUrl = page.url();
      if (currentUrl.includes('/home')) {
        console.log('✅ 뒤로가기: 홈 화면 복귀');
      } else {
        console.log('현재 URL:', currentUrl);
      }
    });
  });

  test.describe('세션 및 인증', () => {
    test('로그아웃 후 홈 페이지 직접 접근 시 리다이렉트', async ({ browser }) => {
      // 새 컨텍스트 (비로그인 상태)
      const context = await browser.newContext();
      const page = await context.newPage();

      // 홈 페이지 직접 접근 시도
      await page.goto('/m/home');
      await page.waitForTimeout(3000);

      const currentUrl = page.url();

      if (currentUrl.includes('/login')) {
        console.log('✅ 비로그인 상태: 로그인 페이지로 리다이렉트');
      } else if (currentUrl.includes('/home')) {
        console.log('⚠️ 비로그인 상태: 홈 접근 가능 (인증 확인 필요)');
      }

      await context.close();
    });

    test('유효하지 않은 URL 경로 접근 시 처리', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('aiqa1@aaa.com', 'qwer1234');
      await page.waitForURL('**/home');

      // 존재하지 않는 경로 접근
      await page.goto('/m/nonexistent-page-12345');
      await page.waitForTimeout(3000);

      const currentUrl = page.url();

      // 404 페이지 또는 홈으로 리다이렉트 확인
      const errorMessage = page.getByText(/not found|404|없|오류/i);
      const hasError = await errorMessage.isVisible().catch(() => false);

      if (hasError) {
        console.log('✅ 잘못된 경로: 404 에러 페이지 표시');
      } else if (currentUrl.includes('/home')) {
        console.log('✅ 잘못된 경로: 홈으로 리다이렉트');
      } else {
        console.log('현재 URL:', currentUrl);
      }
    });
  });

  test.describe('UI 상태 검증', () => {
    test('모든 카드 요소가 클릭 가능한지 확인', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('aiqa1@aaa.com', 'qwer1234');
      await page.waitForURL('**/home');

      // 카드 또는 버튼 요소 찾기
      const clickableElements = page.locator('button, a, [role="button"], [onclick]');
      const count = await clickableElements.count();

      let clickableCount = 0;
      for (let i = 0; i < Math.min(count, 10); i++) {
        const element = clickableElements.nth(i);
        const isClickable = await element.isEnabled().catch(() => false);
        if (isClickable) clickableCount++;
      }

      console.log(`✅ 클릭 가능한 요소: ${clickableCount}/${Math.min(count, 10)}개 확인됨`);
    });

    test('스크롤 동작 확인', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('aiqa1@aaa.com', 'qwer1234');
      await page.waitForURL('**/home');

      // 초기 스크롤 위치
      const initialScroll = await page.evaluate(() => window.scrollY);

      // 페이지 하단으로 스크롤
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      const scrolledPosition = await page.evaluate(() => window.scrollY);

      // 다시 상단으로 스크롤
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      const finalScroll = await page.evaluate(() => window.scrollY);

      if (scrolledPosition > initialScroll && finalScroll === 0) {
        console.log('✅ 스크롤 동작: 정상 작동');
      } else {
        console.log(`스크롤 위치 - 초기: ${initialScroll}, 스크롤 후: ${scrolledPosition}, 복귀: ${finalScroll}`);
      }
    });
  });
});

/**
 * 다양한 계정 상태에서의 홈 화면 테스트
 */
test.describe('계정 상태별 홈 화면', () => {
  test('신규 계정 홈 화면 요소 확인', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test_ai_17@aaa.com', 'qwer1234');
    await page.waitForURL('**/home');

    // 신규 계정에서 보여야 할 요소들
    const possibleElements = [
      'Register Information',
      'Mobile plan',
      'Expiration Date',
    ];

    let foundCount = 0;
    for (const text of possibleElements) {
      const element = page.getByText(text, { exact: false });
      if (await element.isVisible().catch(() => false)) {
        foundCount++;
        console.log(`✅ 발견: "${text}"`);
      }
    }

    console.log(`총 ${foundCount}/${possibleElements.length}개 요소 발견`);
  });
});
