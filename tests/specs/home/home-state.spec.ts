import { test, expect } from '@playwright/test';
import { LoginPage, HomePage } from '../../pages';
import { testUsers, homePageExpectedElements, type UserState } from '../../fixtures';

/**
 * 사용자 상태별 홈 페이지 테스트
 *
 * 각 사용자 상태에 따라 홈 화면에 표시되는 요소가 다릅니다.
 * 이 테스트는 상태별로 올바른 요소가 표시되는지 확인합니다.
 */
test.describe('홈 페이지 - 상태별 테스트', () => {
  /**
   * 신규 사용자 (여권 미등록) 상태 테스트
   */
  test.describe.skip('신규 사용자 (여권 미등록)', () => {
    const user = testUsers.newUser;
    const expectedElements = homePageExpectedElements[user.state];

    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await page.waitForURL('**/home');
    });

    test('여권 등록 카드가 표시되어야 한다', async ({ page }) => {
      for (const text of expectedElements.shouldBeVisible) {
        await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
      }
    });

    test('요금제 가입 관련 요소가 숨겨져야 한다', async ({ page }) => {
      for (const text of expectedElements.shouldBeHidden) {
        await expect(page.getByText(text, { exact: false })).not.toBeVisible();
      }
    });

    test('정보 등록하기 버튼이 활성화되어야 한다', async ({ page }) => {
      const homePage = new HomePage(page);
      await expect(homePage.registerInfoButton).toBeVisible();
      await expect(homePage.registerInfoButton).toBeEnabled();
    });
  });

  /**
   * 상태별 동적 테스트 생성
   * 각 사용자 타입에 대해 자동으로 테스트 케이스를 생성합니다.
   *
   * 주의: 실제 테스트 계정이 없는 상태는 skip 처리됩니다.
   */
  const availableUsers = [
    { key: 'newUser', skip: false },
    { key: 'passportRegistered', skip: true },  // 실제 계정 없음
    { key: 'arcPending', skip: true },          // 실제 계정 없음
    { key: 'arcVerified', skip: true },         // 실제 계정 없음
    { key: 'planSubscribed', skip: true },      // 실제 계정 없음
  ];

  for (const { key, skip } of availableUsers) {
    const user = testUsers[key];
    if (!user) continue;

    const testFn = skip ? test.skip : test;

    testFn(`[${user.state}] ${user.description} - 화면 요소 확인`, async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await page.waitForURL('**/home');

      const expectedElements = homePageExpectedElements[user.state];

      // 표시되어야 하는 요소 확인
      for (const text of expectedElements.shouldBeVisible) {
        await expect(
          page.getByText(text, { exact: false }).first(),
          `"${text}"가 표시되어야 합니다`
        ).toBeVisible();
      }

      // 숨겨져야 하는 요소 확인
      for (const text of expectedElements.shouldBeHidden) {
        await expect(
          page.getByText(text, { exact: false }),
          `"${text}"가 숨겨져야 합니다`
        ).not.toBeVisible();
      }
    });
  }
});

/**
 * 헬퍼: 특정 상태의 사용자로 로그인
 */
async function loginAsUser(page: import('@playwright/test').Page, userKey: string) {
  const user = testUsers[userKey];
  if (!user) {
    throw new Error(`User not found: ${userKey}`);
  }

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(user.email, user.password);
  await page.waitForURL('**/home');

  return user;
}
