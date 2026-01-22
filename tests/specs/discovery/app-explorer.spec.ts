import { test, expect } from '@playwright/test';

/**
 * 앱 자동 탐색 테스트
 * 모든 페이지와 링크를 발견하여 매핑합니다.
 */

interface PageInfo {
  url: string;
  title: string;
  links: string[];
  buttons: string[];
  forms: string[];
}

const discoveredPages: Map<string, PageInfo> = new Map();

test.describe('앱 자동 탐색', () => {
  test('홈 페이지에서 시작하여 모든 페이지 탐색', async ({ page }) => {
    // 로그인
    await page.goto('/login');
    const emailInput = page.getByRole('textbox').first();
    const passwordInput = page.getByRole('textbox').nth(1);
    await emailInput.fill('aiqa1@aaa.com');
    await passwordInput.fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/home', { timeout: 15000 });

    console.log('\n========================================');
    console.log('🔍 앱 자동 탐색 시작');
    console.log('========================================\n');

    // 1. 홈 페이지 분석
    console.log('📄 [홈 페이지] /m/home');
    const homeLinks = await page.locator('a, button').allTextContents();
    console.log('   링크/버튼:', homeLinks.filter(t => t.trim()).slice(0, 10).join(', '));

    // 2. 하단 네비게이션 페이지들 탐색
    const navItems = ['Home', 'LIFE', 'Benefits', 'My Page'];

    for (const nav of navItems) {
      await page.getByText(nav, { exact: true }).click();
      await page.waitForTimeout(1000);

      const url = page.url();
      console.log(`\n📄 [${nav}] ${url}`);

      // 페이지 내 주요 요소 수집
      const headings = await page.locator('h1, h2, h3, h4, h5').allTextContents();
      const buttons = await page.locator('button').allTextContents();
      const links = await page.locator('a').allTextContents();

      console.log('   제목:', headings.filter(t => t.trim()).slice(0, 5).join(' | '));
      console.log('   버튼:', buttons.filter(t => t.trim()).slice(0, 5).join(', '));
    }

    // 3. 마이페이지 서브메뉴 탐색
    await page.getByText('My Page', { exact: true }).click();
    await page.waitForTimeout(500);

    const myPageMenus = [
      'My Point Balance',
      'Payment details',
      'Help Center',
      'Terms and Conditions',
      'Privacy Policy'
    ];

    console.log('\n========================================');
    console.log('📁 마이페이지 서브메뉴 탐색');
    console.log('========================================');

    for (const menu of myPageMenus) {
      await page.getByText('My Page', { exact: true }).click();
      await page.waitForTimeout(500);

      const menuLink = page.getByText(menu).first();
      if (await menuLink.count() > 0) {
        await menuLink.click();
        await page.waitForTimeout(1000);

        const url = page.url();
        console.log(`\n📄 [${menu}] ${url}`);

        const headings = await page.locator('h1, h2, h3, h4, h5').allTextContents();
        console.log('   제목:', headings.filter(t => t.trim()).slice(0, 3).join(' | '));
      }
    }

    // 4. 홈에서 접근 가능한 기능들 탐색
    console.log('\n========================================');
    console.log('📁 홈 페이지 기능 탐색');
    console.log('========================================');

    await page.getByText('Home', { exact: true }).click();
    await page.waitForTimeout(500);

    // Register Information 버튼
    const registerBtn = page.getByText('Register Information');
    if (await registerBtn.count() > 0) {
      await registerBtn.click();
      await page.waitForTimeout(1000);
      console.log(`\n📄 [Register Information] ${page.url()}`);
      const headings = await page.locator('h1, h2, h3, h4, h5').allTextContents();
      console.log('   제목:', headings.filter(t => t.trim()).slice(0, 3).join(' | '));
      await page.goBack();
    }

    // Mobile plan 버튼들
    await page.getByText('Home', { exact: true }).click();
    await page.waitForTimeout(500);

    const mobilePlanBtn = page.getByText('Mobile plan with free USIM');
    if (await mobilePlanBtn.count() > 0) {
      await mobilePlanBtn.click();
      await page.waitForTimeout(1000);
      console.log(`\n📄 [Mobile Plan USIM] ${page.url()}`);
      await page.goBack();
    }

    await page.getByText('Home', { exact: true }).click();
    await page.waitForTimeout(500);

    const esimBtn = page.getByText('Free eSIM Mobile Plan');
    if (await esimBtn.count() > 0) {
      await esimBtn.click();
      await page.waitForTimeout(1000);
      console.log(`\n📄 [eSIM Plan] ${page.url()}`);
      await page.goBack();
    }

    // Airport 버튼
    await page.getByText('Home', { exact: true }).click();
    await page.waitForTimeout(500);

    const airportBtn = page.getByText('Airport');
    if (await airportBtn.count() > 0) {
      await airportBtn.first().click();
      await page.waitForTimeout(1000);
      console.log(`\n📄 [Airport] ${page.url()}`);
    }

    console.log('\n========================================');
    console.log('✅ 탐색 완료');
    console.log('========================================\n');
  });

  test('LIFE 페이지 상세 탐색', async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.getByRole('textbox').first().fill('aiqa1@aaa.com');
    await page.getByRole('textbox').nth(1).fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/home', { timeout: 15000 });

    // LIFE 페이지로 이동
    await page.getByText('LIFE', { exact: true }).click();
    await page.waitForTimeout(1000);

    console.log('\n========================================');
    console.log('📁 LIFE 페이지 상세 탐색');
    console.log('========================================');
    console.log(`URL: ${page.url()}`);

    // 모든 카드/링크 수집
    const cards = await page.locator('[class*="card"], [class*="Card"]').count();
    const links = await page.locator('a').allTextContents();
    const buttons = await page.locator('button').allTextContents();

    console.log(`카드 수: ${cards}`);
    console.log('링크:', links.filter(t => t.trim()).join(', '));
    console.log('버튼:', buttons.filter(t => t.trim()).join(', '));

    await page.screenshot({ path: 'reports/discovery-life.png', fullPage: true });
  });

  test('Benefits 페이지 상세 탐색', async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.getByRole('textbox').first().fill('aiqa1@aaa.com');
    await page.getByRole('textbox').nth(1).fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/home', { timeout: 15000 });

    // Benefits 페이지로 이동
    await page.getByText('Benefits', { exact: true }).click();
    await page.waitForTimeout(1000);

    console.log('\n========================================');
    console.log('📁 Benefits 페이지 상세 탐색');
    console.log('========================================');
    console.log(`URL: ${page.url()}`);

    // 모든 요소 수집
    const headings = await page.locator('h1, h2, h3, h4, h5').allTextContents();
    const buttons = await page.locator('button').allTextContents();

    console.log('제목:', headings.filter(t => t.trim()).join(' | '));
    console.log('버튼:', buttons.filter(t => t.trim()).join(', '));

    await page.screenshot({ path: 'reports/discovery-benefits.png', fullPage: true });
  });
});
