import { Page, Locator, expect } from '@playwright/test';

/**
 * Represents the Register Page of the HireVisa application.
 * This Page Object Model (POM) provides methods and locators for interacting with elements
 * on the registration page, focusing on header and footer navigation and information links.
 *
 * Note: Based on the provided HTML and interactive elements summary,
 * this POM primarily covers header and footer elements.
 * Specific registration form fields (e.g., email, password, submit button)
 * were not present in the provided interactive elements summary.
 * If these elements exist, they should be added here.
 */
export class RegisterPage {
  readonly page: Page;
  readonly url: string = 'http://qa.hirevisa.com/register';
  readonly pageTitle: string = 'HireVisa';

  // --- Header Section Locators ---
  /**
   * Locator for a generic button in the application header.
   * Its exact function (e.g., menu toggle, logo) is not clear from the summary.
   */
  readonly headerGenericButton: Locator;
  /**
   * Locator for the "Make an inquiry" button in the header.
   */
  readonly makeAnInquiryButton: Locator;
  /**
   * Locator for the "Go to Home" button in the header.
   */
  readonly goToHomeButtonHeader: Locator;

  // --- Footer Section Locators ---
  /**
   * Locator for a generic button within a dialog in the footer.
   * This might be a close button for a modal or similar.
   */
  readonly footerDialogCloseButton: Locator;
  /**
   * Locator for the "Terms and Conditions" button in the footer.
   */
  readonly termsAndConditionsButton: Locator;
  /**
   * Locator for the "Privacy Policy" button in the footer.
   */
  readonly privacyPolicyButton: Locator;
  /**
   * Locator for the "Refund Policy" button in the footer.
   */
  readonly refundPolicyButton: Locator;
  /**
   * Locator for the "FAQ" button in the footer.
   */
  readonly faqButton: Locator;
  /**
   * Locator for the "Home" button in the footer.
   */
  readonly homeButtonFooter: Locator;
  /**
   * Locator for the "LIFE" button in the footer.
   */
  readonly lifeButton: Locator;
  /**
   * Locator for the "Benefits" button in the footer.
   */
  readonly benefitsButton: Locator;
  /**
   * Locator for the "My Page" button in the footer.
   */
  readonly myPageButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize Header Locators
    this.headerGenericButton = page.locator('#app-header > div > div > button');
    this.makeAnInquiryButton = page.getByRole('button', { name: 'Make an inquiry' });
    this.goToHomeButtonHeader = page.getByRole('button', { name: 'Go to Home' });

    // Initialize Footer Locators
    this.footerDialogCloseButton = page.locator('#app-footer > div.presentation.invisible:nth-child(1) > dialog > button');
    this.termsAndConditionsButton = page.getByRole('button', { name: 'Terms and Conditions' });
    this.privacyPolicyButton = page.getByRole('button', { name: 'Privacy Policy' });
    this.refundPolicyButton = page.getByRole('button', { name: 'Refund Policy' });
    this.faqButton = page.getByRole('button', { name: 'FAQ' });
    this.homeButtonFooter = page.getByRole('button', { name: 'Home' });
    this.lifeButton = page.getByRole('button', { name: 'LIFE' });
    this.benefitsButton = page.getByRole('button', { name: 'Benefits' });
    this.myPageButton = page.getByRole('button', { name: 'My Page' });
  }

  /**
   * Navigates to the Register page.
   */
  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  // --- Header Actions ---

  /**
   * Clicks the generic button in the header.
   * Use with caution, as its exact function is not clear from the summary.
   */
  async clickHeaderGenericButton(): Promise<void> {
    await this.headerGenericButton.click();
  }

  /**
   * Clicks the "Make an inquiry" button in the header.
   */
  async clickMakeAnInquiry(): Promise<void> {
    await this.makeAnInquiryButton.click();
  }

  /**
   * Clicks the "Go to Home" button in the header.
   */
  async clickGoToHomeFromHeader(): Promise<void> {
    await this.goToHomeButtonHeader.click();
  }

  // --- Footer Actions ---

  /**
   * Clicks the generic dialog close button in the footer.
   * Use with caution, as its exact function is not clear from the summary.
   */
  async clickFooterDialogCloseButton(): Promise<void> {
    await this.footerDialogCloseButton.click();
  }

  /**
   * Clicks the "Terms and Conditions" button in the footer.
   */
  async clickTermsAndConditions(): Promise<void> {
    await this.termsAndConditionsButton.click();
  }

  /**
   * Clicks the "Privacy Policy" button in the footer.
   */
  async clickPrivacyPolicy(): Promise<void> {
    await this.privacyPolicyButton.click();
  }

  /**
   * Clicks the "Refund Policy" button in the footer.
   */
  async clickRefundPolicy(): Promise<void> {
    await this.refundPolicyButton.click();
  }

  /**
   * Clicks the "FAQ" button in the footer.
   */
  async clickFAQ(): Promise<void> {
    await this.faqButton.click();
  }

  /**
   * Clicks the "Home" button in the footer.
   */
  async clickHomeFromFooter(): Promise<void> {
    await this.homeButtonFooter.click();
  }

  /**
   * Clicks the "LIFE" button in the footer.
   */
  async clickLife(): Promise<void> {
    await this.lifeButton.click();
  }

  /**
   * Clicks the "Benefits" button in the footer.
   */
  async clickBenefits(): Promise<void> {
    await this.benefitsButton.click();
  }

  /**
   * Clicks the "My Page" button in the footer.
   */
  async clickMyPage(): Promise<void> {
    await this.myPageButton.click();
  }

  // --- Assertions ---

  /**
   * Asserts that the current page URL matches the expected Register page URL.
   */
  async verifyUrl(): Promise<void> {
    await expect(this.page).toHaveURL(this.url);
  }

  /**
   * Asserts that the current page title matches the expected title.
   */
  async verifyPageTitle(): Promise<void> {
    await expect(this.page).toHaveTitle(this.pageTitle);
  }

  /**
   * Asserts that all expected header elements are visible.
   */
  async verifyHeaderElementsVisible(): Promise<void> {
    await expect(this.headerGenericButton).toBeVisible();
    await expect(this.makeAnInquiryButton).toBeVisible();
    await expect(this.goToHomeButtonHeader).toBeVisible();
  }

  /**
   * Asserts that all expected footer elements are visible.
   */
  async verifyFooterElementsVisible(): Promise<void> {
    await expect(this.footerDialogCloseButton).toBeVisible();
    await expect(this.termsAndConditionsButton).toBeVisible();
    await expect(this.privacyPolicyButton).toBeVisible();
    await expect(this.refundPolicyButton).toBeVisible();
    await expect(this.faqButton).toBeVisible();
    await expect(this.homeButtonFooter).toBeVisible();
    await expect(this.lifeButton).toBeVisible();
    await expect(this.benefitsButton).toBeVisible();
    await expect(this.myPageButton).toBeVisible();
  }
}