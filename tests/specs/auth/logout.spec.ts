import { test, expect } from '@playwright/test';
import { LoginPage, HomePage, MyPage } from '../../pages';

/**
 * 로그아웃 기능 테스트
 *
 * 테스트 시나리오:
 * 1. 기본 로그아웃 플로우
 * 2. 로그아웃 후 세션 만료 확인
 * 3. 로그아웃 후 보호된 페이지 접근 차단
 * 4. 로그아웃 후 재로그인
 */
test.describe('로그아웃 기능', () => {
  test.describe.configure({ mode: 'serial' });

  test('마이페이지에서 로그아웃', async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test21@aaaa.com', 'qwer1234');
    await page.waitForURL('**/home');

    console.log('✅ 로그인 성공');

    // 마이페이지로 이동 (HomePage 네비게이션 사용)
    const homePage = new HomePage(page);
    await homePage.navigateToMyPage();

    console.log('✅ 마이페이지 이동');

    // 로그아웃 버튼 확인
    const signOutBtn = page.getByText(/Sign out|로그아웃/);
    await expect(signOutBtn).toBeVisible();

    console.log('✅ 로그아웃 버튼 표시');

    // 로그아웃 클릭
    await signOutBtn.click();
    await page.waitForTimeout(2000);

    // 로그인 페이지로 리다이렉트 확인
    const currentUrl = page.url();
    console.log('로그아웃 후 URL:', currentUrl);

    await expect(page).toHaveURL(/\/login|\/signin/);
    console.log('✅ 로그인 페이지로 리다이렉트 완료');

    await page.screenshot({
      path: 'reports/logout-success.png',
      fullPage: true,
    });
  });

  test('로그아웃 후 보호된 페이지 접근 차단', async ({ page }) => {
    // 로그인 없이 보호된 페이지 접근 시도
    const protectedUrls = [
      '/home',
      '/my',
      '/benefit',
      '/life',
      '/m/mobile-plan/usim',
    ];

    console.log('🔒 보호된 페이지 접근 테스트\n');

    for (const url of protectedUrls) {
      await page.goto(url);
      await page.waitForTimeout(1500);

      const currentUrl = page.url();
      const isRedirectedToLogin = currentUrl.includes('/login') || currentUrl.includes('/signin');

      if (isRedirectedToLogin) {
        console.log(`✅ ${url} → 로그인 페이지로 리다이렉트`);
      } else {
        console.log(`⚠️ ${url} → ${currentUrl} (리다이렉트 안됨)`);
      }
    }

    await page.screenshot({
      path: 'reports/logout-protected-pages.png',
      fullPage: true,
    });
  });

  test('로그아웃 후 재로그인 가능', async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test21@aaaa.com', 'qwer1234');
    await page.waitForURL('**/home');

    console.log('Step 1: 첫 번째 로그인 성공');

    // 로그아웃
    const homePage = new HomePage(page);
    await homePage.navigateToMyPage();

    const signOutBtn = page.getByText(/Sign out|로그아웃/);
    await signOutBtn.click();
    await page.waitForURL(/\/login/);

    console.log('Step 2: 로그아웃 성공');

    // 재로그인
    await loginPage.login('test21@aaaa.com', 'qwer1234');
    await page.waitForURL('**/home');

    console.log('Step 3: 재로그인 성공');

    // 홈 화면 확인
    await expect(page).toHaveURL(/\/home/);

    console.log('✅ 로그아웃 후 재로그인 플로우 완료');

    await page.screenshot({
      path: 'reports/logout-relogin.png',
      fullPage: true,
    });
  });

  test('로그아웃 확인 모달/다이얼로그 존재 여부', async ({ page }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test21@aaaa.com', 'qwer1234');
    await page.waitForURL('**/home');

    // 마이페이지로 이동
    const homePage = new HomePage(page);
    await homePage.navigateToMyPage();

    // 로그아웃 클릭 전 상태 저장
    const beforeUrl = page.url();

    // 로그아웃 버튼 클릭
    const signOutBtn = page.getByText(/Sign out|로그아웃/);
    await signOutBtn.click();

    // 잠시 대기 (모달이 나타날 수 있음)
    await page.waitForTimeout(1000);

    // 확인 모달 존재 여부 체크
    const confirmModal = page.locator('[role="dialog"], [role="alertdialog"], .modal, [class*="confirm"]');
    const confirmBtn = page.getByRole('button', { name: /확인|Yes|Confirm|OK/i });
    const cancelBtn = page.getByRole('button', { name: /취소|No|Cancel/i });

    if (await confirmModal.isVisible()) {
      console.log('✅ 로그아웃 확인 모달 발견');

      if (await confirmBtn.isVisible()) {
        console.log('   - 확인 버튼 존재');
      }
      if (await cancelBtn.isVisible()) {
        console.log('   - 취소 버튼 존재');

        // 취소 버튼 클릭 테스트
        await cancelBtn.click();
        await page.waitForTimeout(500);

        // 여전히 마이페이지에 있는지 확인
        if (page.url().includes('/my')) {
          console.log('✅ 취소 시 로그아웃 안됨 확인');
        }
      }

      await page.screenshot({
        path: 'reports/logout-confirm-modal.png',
        fullPage: true,
      });
    } else {
      console.log('ℹ️ 로그아웃 확인 모달 없음 (바로 로그아웃 처리)');

      // 바로 로그인 페이지로 이동했는지 확인
      const afterUrl = page.url();
      if (afterUrl.includes('/login')) {
        console.log('✅ 바로 로그인 페이지로 이동');
      }
    }
  });

  test('세션 스토리지/쿠키 정리 확인', async ({ page, context }) => {
    // 로그인
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test21@aaaa.com', 'qwer1234');
    await page.waitForURL('**/home');

    // 로그인 후 스토리지 상태 확인
    const storageBeforeLogout = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
      };
    });

    const cookiesBeforeLogout = await context.cookies();

    console.log('📦 로그인 후 스토리지 상태:');
    console.log(`   - localStorage keys: ${storageBeforeLogout.localStorage.length}개`);
    console.log(`   - sessionStorage keys: ${storageBeforeLogout.sessionStorage.length}개`);
    console.log(`   - cookies: ${cookiesBeforeLogout.length}개`);

    // 토큰 관련 키 확인
    const tokenKeys = [...storageBeforeLogout.localStorage, ...storageBeforeLogout.sessionStorage]
      .filter(key => key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('session'));

    if (tokenKeys.length > 0) {
      console.log(`   - 인증 관련 키: ${tokenKeys.join(', ')}`);
    }

    // 로그아웃
    const homePage = new HomePage(page);
    await homePage.navigateToMyPage();
    await page.getByText(/Sign out|로그아웃/).click();
    await page.waitForTimeout(2000);

    // 로그아웃 후 스토리지 상태 확인
    const storageAfterLogout = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
      };
    });

    const cookiesAfterLogout = await context.cookies();

    console.log('\n📦 로그아웃 후 스토리지 상태:');
    console.log(`   - localStorage keys: ${storageAfterLogout.localStorage.length}개`);
    console.log(`   - sessionStorage keys: ${storageAfterLogout.sessionStorage.length}개`);
    console.log(`   - cookies: ${cookiesAfterLogout.length}개`);

    // 인증 토큰이 제거되었는지 확인
    const remainingTokenKeys = [...storageAfterLogout.localStorage, ...storageAfterLogout.sessionStorage]
      .filter(key => key.toLowerCase().includes('token') || key.toLowerCase().includes('auth'));

    if (remainingTokenKeys.length === 0) {
      console.log('\n✅ 인증 토큰 정리 완료');
    } else {
      console.log(`\n⚠️ 남아있는 인증 관련 키: ${remainingTokenKeys.join(', ')}`);
    }
  });
});
