import { Page, Locator, expect } from '@playwright/test';

/**
 * 홈 페이지 (로그인 후 메인 화면)
 * URL: /m/home
 *
 * 2026-02-02 업데이트: 영어/한국어 이중 언어 지원
 */
export class HomePage {
  readonly page: Page;

  // 헤더 영역
  readonly todoSection: Locator;

  // 여권 등록 카드
  readonly passportCard: Locator;
  readonly registerInfoButton: Locator;

  // 통신 요금제 섹션 (Issue a phone number for immigration registration)
  readonly phonePlanSection: Locator;
  readonly usimPlanButton: Locator;
  readonly esimPlanButton: Locator;

  // Pre-entry Requirements 섹션
  readonly preEntrySection: Locator;
  readonly preEntryLink: Locator;

  // Related Services 섹션
  readonly relatedServicesSection: Locator;
  readonly topikButton: Locator;

  // 하단 네비게이션
  readonly navHome: Locator;
  readonly navLife: Locator;
  readonly navBenefit: Locator;
  readonly navMyPage: Locator;

  // 푸터
  readonly termsOfServiceLink: Locator;
  readonly privacyPolicyLink: Locator;
  readonly refundPolicyLink: Locator;
  readonly faqLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // 헤더 - To-Do 섹션
    this.todoSection = page.locator('text=/To-Do|할 일/i').first();

    // 여권 등록 카드
    this.passportCard = page.getByText(/Verify your identity with your passport|본인 확인을 위해 여권을 등록/i);
    this.registerInfoButton = page.getByRole('button', { name: /Register Information|정보 등록하기/i });

    // 통신 요금제 섹션
    this.phonePlanSection = page.getByText(/Issue a phone number for immigration registration|출입국등록을 위한 전화번호 발급/i);
    this.usimPlanButton = page.getByText(/Apply for USIM|유심 무료 제공 요금제|USIM 신청/i);
    this.esimPlanButton = page.getByText(/Apply for eSIM|이심 무료 설치 요금제|eSIM 신청/i);

    // Pre-entry Requirements 섹션
    this.preEntrySection = page.getByText(/Pre-entry Requirements|입국 전 준비사항/i);
    this.preEntryLink = page.getByText(/Please register the entry information|입국 정보를 등록해 주세요/i);

    // Related Services 섹션
    this.relatedServicesSection = page.getByText(/Related Services|관련 서비스/i);
    this.topikButton = page.getByText(/TOPIK/i).first();

    // 하단 네비게이션 (영어/한국어 모두 지원)
    this.navHome = page.locator('#nav-button-visa, [data-testid="nav-home"]').or(
      page.getByRole('button', { name: /^Home$|^홈$/i })
    ).or(page.locator('text=/^Home$/i').first());
    this.navLife = page.locator('#nav-button-life, [data-testid="nav-life"]').or(
      page.getByRole('button', { name: /^LIFE$|^라이프$/i })
    ).or(page.locator('text=/^LIFE$/i').first());
    this.navBenefit = page.locator('#nav-button-benefit, [data-testid="nav-benefit"]').or(
      page.getByRole('button', { name: /^Benefits$|^혜택$/i })
    ).or(page.locator('text=/^Benefits$/i').first());
    this.navMyPage = page.locator('#nav-button-mypage, [data-testid="nav-mypage"]').or(
      page.getByRole('button', { name: /^My Page$|^마이페이지$/i })
    ).or(page.locator('text=/^My Page$/i').first());

    // 푸터 링크 (영어/한국어)
    this.termsOfServiceLink = page.getByText(/Terms and Conditions|서비스 이용 약관|이용약관/i);
    this.privacyPolicyLink = page.getByText(/Privacy Policy|개인정보처리방침/i);
    this.refundPolicyLink = page.getByText(/Refund Policy|환불규정|환불 정책/i);
    this.faqLink = page.getByText(/^FAQ$|자주 묻는 질문/i);
  }

  async goto() {
    await this.page.goto('/m/home');
    await this.page.waitForLoadState('networkidle');
  }

  async goToPassportRegistration() {
    await this.registerInfoButton.click();
    await this.page.waitForURL('**/submit/passport**', { timeout: 15000 });
  }

  async goToUsimPlan() {
    await this.usimPlanButton.click();
    await this.page.waitForURL('**/usim/**', { timeout: 15000 });
  }

  async goToEsimPlan() {
    await this.esimPlanButton.click();
    await this.page.waitForURL('**/esim/**', { timeout: 15000 });
  }

  // 네비게이션 메서드
  async navigateToLife() {
    await this.navLife.first().click({ force: true });
    await this.page.waitForURL('**/life', { timeout: 10000 });
  }

  async navigateToBenefit() {
    await this.navBenefit.first().click({ force: true });
    await this.page.waitForURL('**/benefit', { timeout: 10000 });
  }

  async navigateToMyPage() {
    await this.navMyPage.first().click({ force: true });
    await this.page.waitForURL('**/my', { timeout: 10000 });
  }

  async expectToBeOnHomePage() {
    await expect(this.page).toHaveURL(/\/m\/home/);
  }

  // 요소 존재 확인 헬퍼
  async hasPassportCard(): Promise<boolean> {
    return await this.passportCard.isVisible().catch(() => false);
  }

  async hasUsimButton(): Promise<boolean> {
    return await this.usimPlanButton.isVisible().catch(() => false);
  }

  async hasEsimButton(): Promise<boolean> {
    return await this.esimPlanButton.isVisible().catch(() => false);
  }
}
