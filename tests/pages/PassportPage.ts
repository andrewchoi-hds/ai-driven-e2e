import { Page, Locator, expect } from '@playwright/test';

/**
 * 여권 등록 페이지
 * URL: /m/home/submit/passport
 */
export class PassportPage {
  readonly page: Page;

  // 헤더
  readonly pageTitle: Locator;
  readonly backButton: Locator;

  // 여권 업로드 섹션
  readonly uploadInstructions: Locator;
  readonly uploadArea: Locator;
  readonly fileInput: Locator;

  // 액션 버튼
  readonly nextButton: Locator;

  // 푸터
  readonly termsOfServiceLink: Locator;
  readonly privacyPolicyLink: Locator;
  readonly refundPolicyLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // 헤더
    this.pageTitle = page.getByText('여권을 업로드 해주세요');
    this.backButton = page.locator('button[aria-label*="back"], button:has-text("뒤로")').first();

    // 여권 업로드 섹션
    this.uploadInstructions = page.getByText('여권을 업로드 해주세요');
    this.uploadArea = page.locator('[class*="upload"], [class*="dropzone"], input[type="file"]').first();
    this.fileInput = page.locator('input[type="file"]');

    // 액션 버튼
    this.nextButton = page.getByRole('button', { name: '다음' });

    // 푸터
    this.termsOfServiceLink = page.getByText('서비스 이용 약관');
    this.privacyPolicyLink = page.getByText('개인정보처리방침');
    this.refundPolicyLink = page.getByText('환불규정');
  }

  async goto() {
    await this.page.goto('/m/home/submit/passport');
    await this.page.waitForLoadState('networkidle');
  }

  async uploadPassport(filePath: string) {
    // 파일 입력 요소에 파일 설정
    await this.fileInput.setInputFiles(filePath);
  }

  async clickNext() {
    await this.nextButton.click();
  }

  async goBack() {
    await this.backButton.click();
    await this.page.waitForURL('**/home');
  }

  async expectToBeOnPassportPage() {
    await expect(this.page).toHaveURL(/\/submit\/passport/);
    await expect(this.uploadInstructions).toBeVisible();
  }

  async expectNextButtonDisabled() {
    await expect(this.nextButton).toBeDisabled();
  }

  async expectNextButtonEnabled() {
    await expect(this.nextButton).toBeEnabled();
  }
}
