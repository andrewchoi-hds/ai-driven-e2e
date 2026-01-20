import { Page, Locator, expect } from '@playwright/test';

/**
 * 홈 페이지 (로그인 후 메인 화면)
 * URL: /m/home
 */
export class HomePage {
  readonly page: Page;

  // 헤더 영역
  readonly headerTitle: Locator;

  // 본인 확인 카드
  readonly passportCard: Locator;
  readonly registerInfoButton: Locator;

  // 관련 서비스 섹션
  readonly relatedServicesSection: Locator;
  readonly telecomButton: Locator;
  readonly airportButton: Locator;
  readonly addressBookButton: Locator;

  // 요금제 섹션
  readonly usimPlanButton: Locator;
  readonly esimPlanButton: Locator;

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

    // 헤더
    this.headerTitle = page.getByText('할 일');

    // 본인 확인 카드
    this.passportCard = page.getByText('본인 확인을 위해 여권을 등록해 주세요');
    this.registerInfoButton = page.getByRole('button', { name: '정보 등록하기' });

    // 관련 서비스
    this.relatedServicesSection = page.getByText('관련 서비스');
    this.telecomButton = page.getByText('통신', { exact: true });
    this.airportButton = page.getByText('공항', { exact: true });
    this.addressBookButton = page.getByText('주소록', { exact: true });

    // 요금제
    this.usimPlanButton = page.getByText('유심 무료 제공 요금제');
    this.esimPlanButton = page.getByText('이심 무료 설치 요금제');

    // 하단 네비게이션
    this.navHome = page.getByText('홈', { exact: true });
    this.navLife = page.getByText('라이프', { exact: true });
    this.navBenefit = page.getByText('혜택', { exact: true });
    this.navMyPage = page.getByText('마이페이지', { exact: true });

    // 푸터 링크
    this.termsOfServiceLink = page.getByText('서비스 이용 약관');
    this.privacyPolicyLink = page.getByText('개인정보처리방침');
    this.refundPolicyLink = page.getByText('환불규정');
    this.faqLink = page.getByText('자주 묻는 질문');
  }

  async goto() {
    await this.page.goto('/m/home');
    await this.page.waitForLoadState('networkidle');
  }

  async goToPassportRegistration() {
    await this.registerInfoButton.click();
    await this.page.waitForURL('**/submit/passport');
  }

  async goToTelecom() {
    await this.telecomButton.click();
    await this.page.waitForURL('**/mobile-plan/**');
  }

  async goToAirport() {
    await this.airportButton.click();
    await this.page.waitForURL('**/airport');
  }

  async goToUsimPlan() {
    await this.usimPlanButton.click();
    await this.page.waitForURL('**/usim/**');
  }

  async goToEsimPlan() {
    await this.esimPlanButton.click();
    await this.page.waitForURL('**/esim/**');
  }

  // 네비게이션 메서드
  async navigateToLife() {
    await this.navLife.click({ force: true });
    await this.page.waitForURL('**/life');
  }

  async navigateToBenefit() {
    await this.navBenefit.click({ force: true });
    await this.page.waitForURL('**/benefit');
  }

  async navigateToMyPage() {
    await this.navMyPage.click({ force: true });
    await this.page.waitForURL('**/my');
  }

  async expectToBeOnHomePage() {
    await expect(this.page).toHaveURL(/\/m\/home/);
    await expect(this.registerInfoButton).toBeVisible();
  }
}
