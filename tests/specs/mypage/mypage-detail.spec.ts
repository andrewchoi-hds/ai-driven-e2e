import { test, expect } from '@playwright/test';
import { MyPage } from '../../pages';

/**
 * 마이페이지 서브 페이지 상세 테스트
 */
test.describe('마이페이지 서브 페이지', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    const emailInput = page.getByRole('textbox').first();
    const passwordInput = page.getByRole('textbox').nth(1);
    await emailInput.fill('aiqa1@aaa.com');
    await passwordInput.fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/home', { timeout: 15000 });

    // 마이페이지로 이동
    await page.getByText('My Page', { exact: true }).click();
    await page.waitForURL('**/my', { timeout: 10000 });
  });

  // ============================================
  // My Point Balance 페이지
  // ============================================

  test.describe('My Point Balance 페이지', () => {
    test('포인트 페이지 URL 및 요소 확인', async ({ page }) => {
      await page.getByText('My Point Balance').click();

      // URL 확인
      await expect(page).toHaveURL(/\/m\/my\/points/);

      // 주요 요소 확인
      await expect(page.getByText('My Point')).toBeVisible();
      await expect(page.getByText('0')).toBeVisible();
    });

    test('뒤로가기 버튼 동작', async ({ page }) => {
      await page.getByText('My Point Balance').click();
      await expect(page).toHaveURL(/\/m\/my\/points/);

      // 뒤로가기 버튼 클릭
      await page.goBack();
      await expect(page).toHaveURL(/\/m\/my$/);
    });
  });

  // ============================================
  // Payment details 페이지
  // ============================================

  test.describe('Payment details 페이지', () => {
    test('결제 내역 페이지 URL 및 요소 확인', async ({ page }) => {
      await page.getByText('Payment details').click();

      // URL 확인
      await expect(page).toHaveURL(/\/m\/my\/payment\/history/);

      // 주요 요소 확인
      await expect(page.getByText('Payment details')).toBeVisible();
    });

    test('결제 내역 없음 상태 표시', async ({ page }) => {
      await page.getByText('Payment details').click();

      // 빈 상태 메시지 확인
      await expect(page.getByText('There is no payment history yet.')).toBeVisible();
    });

    test('뒤로가기 버튼 동작', async ({ page }) => {
      await page.getByText('Payment details').click();
      await expect(page).toHaveURL(/\/m\/my\/payment\/history/);

      await page.goBack();
      await expect(page).toHaveURL(/\/m\/my$/);
    });
  });

  // ============================================
  // Help Center 페이지
  // ============================================

  test.describe('Help Center 페이지', () => {
    test('헬프 센터 페이지 URL 및 요소 확인', async ({ page }) => {
      await page.getByText('Help Center').click();

      // URL 확인
      await expect(page).toHaveURL(/\/m\/helpcenter/);

      // 주요 요소 확인
      await expect(page.getByText('How can help today?')).toBeVisible();
    });

    test('카테고리 탭 표시 확인', async ({ page }) => {
      await page.getByText('Help Center').click();

      // 카테고리 탭들 확인
      await expect(page.getByText('RC Issuance')).toBeVisible();
      await expect(page.getByText('RC Progress')).toBeVisible();
      await expect(page.getByText('Documents')).toBeVisible();
      await expect(page.getByText('Extension')).toBeVisible();
      await expect(page.getByText('Payment/Refund')).toBeVisible();
      await expect(page.getByText('Others')).toBeVisible();
    });

    test('FAQ 항목 표시 확인', async ({ page }) => {
      await page.getByText('Help Center').click();

      // FAQ 질문들 확인
      await expect(page.getByText('Am I eligible to apply for a RC(ARC)?')).toBeVisible();
      await expect(page.getByText('Where and how can I apply for a RC(ARC)?')).toBeVisible();
    });

    test('문의하기 버튼 표시 확인', async ({ page }) => {
      await page.getByText('Help Center').click();

      // Need help 섹션 확인
      await expect(page.getByText('Need help?')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Inquiry History' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Inquire' })).toBeVisible();
    });

    test('뒤로가기로 마이페이지 복귀', async ({ page }) => {
      await page.getByText('Help Center').click();
      await expect(page).toHaveURL(/\/m\/helpcenter/);

      // 브라우저 뒤로가기
      await page.goBack();
      await expect(page).toHaveURL(/\/m\/my/);
    });
  });

  // ============================================
  // Terms and Conditions 페이지
  // ============================================

  test.describe('Terms and Conditions 페이지', () => {
    test('약관 페이지 URL 및 요소 확인', async ({ page }) => {
      await page.getByText('Terms and Conditions').first().click();

      // URL 확인
      await expect(page).toHaveURL(/\/m\/policy\/terms/);

      // 주요 요소 확인 (헤더 타이틀)
      await expect(page.getByText('Terms of Service', { exact: true })).toBeVisible();
    });

    test('약관 내용 Article 표시 확인', async ({ page }) => {
      await page.getByText('Terms and Conditions').first().click();

      // Article 항목들 확인
      await expect(page.getByText('Article 1 (Purpose)')).toBeVisible();
      await expect(page.getByText('Article 2 (Definition of Terms)')).toBeVisible();
    });

    test('뒤로가기 버튼 동작', async ({ page }) => {
      await page.getByText('Terms and Conditions').first().click();
      await expect(page).toHaveURL(/\/m\/policy\/terms/);

      await page.goBack();
      await expect(page).toHaveURL(/\/m\/my$/);
    });
  });

  // ============================================
  // Privacy Policy 페이지
  // ============================================

  test.describe('Privacy Policy 페이지', () => {
    test('개인정보처리방침 페이지 URL 및 요소 확인', async ({ page }) => {
      await page.getByText('Privacy Policy').first().click();

      // URL 확인
      await expect(page).toHaveURL(/\/m\/policy\/privacy/);

      // 주요 요소 확인
      await expect(page.getByText('Privacy Policy').first()).toBeVisible();
    });

    test('뒤로가기 버튼 동작', async ({ page }) => {
      await page.getByText('Privacy Policy').first().click();
      await expect(page).toHaveURL(/\/m\/policy\/privacy/);

      await page.goBack();
      await expect(page).toHaveURL(/\/m\/my$/);
    });
  });
});
