import { test, expect } from '@playwright/test';
import {
  createNewTestAccount,
  loginWithAccount,
  updateAccountState,
} from '../../fixtures/test-account-manager';

/**
 * 요금제 가입 완료 플로우 테스트
 *
 * 체류기간 선택 → 요금제 선택 → 가입 완료까지 전체 플로우
 */

test.describe('요금제 완전 플로우 탐색', () => {
  test.beforeEach(async ({ page }) => {
    // 여권 등록 완료된 계정 사용
    await loginWithAccount(page, 'test_ai_16@aaa.com', 'qwer1234');
  });

  test('USIM 요금제 전체 플로우 탐색', async ({ page }) => {
    // 홈에서 USIM 요금제 버튼 클릭
    const usimBtn = page.getByText('Mobile plan with free USIM');

    if (!(await usimBtn.isVisible().catch(() => false))) {
      console.log('USIM 버튼 없음 - 직접 URL 접근');
      await page.goto('/m/mobile-plan/usim');
      await page.waitForTimeout(2000);
    } else {
      await usimBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log('\n========================================');
    console.log('📋 USIM 요금제 전체 플로우 탐색');
    console.log('========================================\n');

    console.log('Step 1 URL:', page.url());

    // Step 1: 체류 기간 선택
    const stayDuration = page.getByText('6 months or longer');
    if (await stayDuration.isVisible().catch(() => false)) {
      console.log('Step 1: 체류 기간 선택 페이지');
      await stayDuration.click();
      await page.waitForTimeout(500);

      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(2000);
    }

    console.log('Step 2 URL:', page.url());

    // Step 2: 요금제 선택 페이지 분석
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter((h) => h.trim()).join(' | '));

    // 요금제 옵션 찾기
    const planCards = page.locator('[class*="card"], [class*="Card"], [class*="plan"], [class*="Plan"]');
    const cardCount = await planCards.count();
    console.log(`요금제 카드 수: ${cardCount}`);

    // 버튼들 확인
    const buttons = await page.locator('button').allTextContents();
    console.log('버튼들:', buttons.filter((b) => b.trim()).join(', '));

    // 가격 정보 확인
    const priceElements = await page.locator('text=/₩|원|won|KRW/i').allTextContents();
    console.log('가격 정보:', priceElements.slice(0, 5).join(', '));

    // 클릭 가능한 요금제 옵션 찾기
    const clickableOptions = page.locator('button, [role="button"], [class*="option"], [class*="select"]');
    const optionCount = await clickableOptions.count();
    console.log(`클릭 가능한 옵션: ${optionCount}개`);

    for (let i = 0; i < Math.min(optionCount, 10); i++) {
      const text = await clickableOptions.nth(i).textContent();
      if (text && text.trim() && text.length < 100) {
        console.log(`  [${i}] ${text.trim().substring(0, 50)}`);
      }
    }

    await page.screenshot({
      path: 'reports/plan-step2-analysis.png',
      fullPage: true,
    });

    // 요금제 선택 시도
    // "Select" 또는 특정 요금제 버튼 찾기
    const selectBtn = page.getByRole('button', { name: /select|선택|apply|신청/i }).first();
    if (await selectBtn.isVisible().catch(() => false)) {
      console.log('\n"Select" 버튼 발견 - 클릭');
      await selectBtn.click();
      await page.waitForTimeout(2000);

      console.log('Step 3 URL:', page.url());

      const newHeadings = await page.locator('h1, h2, h3, h4').allTextContents();
      console.log('Step 3 제목들:', newHeadings.filter((h) => h.trim()).join(' | '));

      await page.screenshot({
        path: 'reports/plan-step3.png',
        fullPage: true,
      });
    }
  });

  test('eSIM 요금제 전체 플로우 탐색', async ({ page }) => {
    const esimBtn = page.getByText('Free eSIM Mobile Plan');

    if (!(await esimBtn.isVisible().catch(() => false))) {
      console.log('eSIM 버튼 없음 - 직접 URL 접근');
      await page.goto('/m/mobile-plan/esim');
      await page.waitForTimeout(2000);
    } else {
      await esimBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log('\n========================================');
    console.log('📋 eSIM 요금제 전체 플로우 탐색');
    console.log('========================================\n');

    console.log('Step 1 URL:', page.url());

    // Step 1: 체류 기간 선택
    const stayDuration = page.getByText('6 months or longer');
    if (await stayDuration.isVisible().catch(() => false)) {
      console.log('Step 1: 체류 기간 선택');
      await stayDuration.click();
      await page.waitForTimeout(500);

      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(2000);
    }

    console.log('Step 2 URL:', page.url());

    // 페이지 분석
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter((h) => h.trim()).join(' | '));

    const buttons = await page.locator('button').allTextContents();
    console.log('버튼들:', buttons.filter((b) => b.trim()).join(', '));

    await page.screenshot({
      path: 'reports/esim-step2-analysis.png',
      fullPage: true,
    });
  });

  test('요금제 선택 후 다음 단계 탐색', async ({ page }) => {
    // 직접 요금제 선택 페이지로 이동 (체류기간 이미 선택된 상태 가정)
    await page.goto('/m/mobile-plan/usim/32');
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 요금제 선택 페이지 직접 접근');
    console.log('========================================\n');

    console.log('URL:', page.url());

    // 페이지 전체 텍스트 분석
    const bodyText = await page.locator('body').textContent();
    console.log('페이지 텍스트 (일부):', bodyText?.substring(0, 500));

    // 요금제 옵션 분석
    const allText = await page.locator('body').allTextContents();

    // Select 버튼들 찾기
    const selectButtons = page.locator('button:has-text("Select"), button:has-text("선택")');
    const selectCount = await selectButtons.count();
    console.log(`\nSelect 버튼 수: ${selectCount}`);

    if (selectCount > 0) {
      // 첫 번째 Select 버튼 클릭
      console.log('첫 번째 요금제 선택...');
      await selectButtons.first().click();
      await page.waitForTimeout(2000);

      console.log('선택 후 URL:', page.url());

      const headings = await page.locator('h1, h2, h3, h4').allTextContents();
      console.log('제목들:', headings.filter((h) => h.trim()).join(' | '));

      await page.screenshot({
        path: 'reports/plan-after-select.png',
        fullPage: true,
      });

      // 다음 단계 분석
      const nextButtons = await page.locator('button').allTextContents();
      console.log('버튼들:', nextButtons.filter((b) => b.trim()).join(', '));
    }
  });
});

test.describe('요금제 동의 및 가입 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithAccount(page, 'test_ai_16@aaa.com', 'qwer1234');
  });

  test('요금제 동의 페이지 분석', async ({ page }) => {
    // 요금제 상세 페이지로 직접 이동
    await page.goto('/m/mobile-plan/usim/32');
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 요금제 동의 페이지 분석');
    console.log('========================================\n');

    // Apply for a Mobile Plan 클릭
    const applyBtn = page.getByRole('button', { name: /Apply for a Mobile Plan/i });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();
    await page.waitForTimeout(2000);

    console.log('URL:', page.url());

    // 동의 페이지 분석
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter((h) => h.trim()).join(' | '));

    // 체크박스 찾기
    const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`체크박스 수: ${checkboxCount}`);

    // 동의 관련 텍스트 찾기
    const consentTexts = await page.locator('label, [class*="consent"], [class*="agree"]').allTextContents();
    console.log('동의 항목들:', consentTexts.filter((t) => t.trim()).slice(0, 10).join(' | '));

    // 버튼들
    const buttons = await page.locator('button').allTextContents();
    console.log('버튼들:', buttons.filter((b) => b.trim()).join(', '));

    await page.screenshot({
      path: 'reports/plan-consent-page.png',
      fullPage: true,
    });

    // 전체 동의 체크박스 찾기
    const agreeAllBtn = page.getByText(/agree.*all|전체.*동의|all.*terms/i);
    if (await agreeAllBtn.count() > 0) {
      console.log('\n"전체 동의" 버튼 발견');
      await agreeAllBtn.first().click();
      await page.waitForTimeout(1000);

      // 체크 상태 확인
      const checkedBoxes = await page.locator('input[type="checkbox"]:checked').count();
      console.log(`체크된 박스: ${checkedBoxes}개`);
    }

    // Next/Submit 버튼 상태
    const nextBtn = page.getByRole('button', { name: /next|submit|apply|신청|완료/i });
    const isEnabled = await nextBtn.isEnabled().catch(() => false);
    console.log(`\nNext/Submit 버튼 활성화: ${isEnabled ? '예' : '아니오'}`);

    await page.screenshot({
      path: 'reports/plan-consent-checked.png',
      fullPage: true,
    });
  });

  test('요금제 가입 신청 시뮬레이션', async ({ page }) => {
    await page.goto('/m/mobile-plan/usim/32');
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 요금제 가입 신청 시뮬레이션');
    console.log('========================================\n');

    // Step 1: Apply 버튼 클릭 (동의 모달 표시)
    const applyBtn = page.getByRole('button', { name: 'Apply for a Mobile Plan' });
    await applyBtn.click();
    await page.waitForTimeout(2000);

    console.log('동의 모달 표시됨');

    // 동의 모달 분석
    const modalText = await page.locator('body').textContent();
    if (modalText?.includes('Consent is required')) {
      console.log('✅ 동의 필요 메시지 확인');
    }

    // Step 2: "Agree and apply" 버튼 클릭
    const agreeBtn = page.getByRole('button', { name: 'Agree and apply' });
    if (await agreeBtn.isVisible()) {
      console.log('"Agree and apply" 버튼 클릭');
      await agreeBtn.click();
      await page.waitForTimeout(3000);

      console.log('다음 페이지 URL:', page.url());

      const headings = await page.locator('h1, h2, h3, h4').allTextContents();
      console.log('제목들:', headings.filter((h) => h.trim()).join(' | '));

      // 입력 필드 분석
      const inputs = page.locator('input:not([type="hidden"]):not([type="checkbox"])');
      const inputCount = await inputs.count();
      console.log(`입력 필드 수: ${inputCount}`);

      for (let i = 0; i < inputCount; i++) {
        const placeholder = (await inputs.nth(i).getAttribute('placeholder')) || '';
        const name = (await inputs.nth(i).getAttribute('name')) || '';
        console.log(`  [${i}] name=${name}, placeholder=${placeholder}`);
      }

      // 버튼들 확인
      const buttons = await page.locator('button').allTextContents();
      console.log('버튼들:', buttons.filter((b) => b.trim()).join(', '));

      await page.screenshot({
        path: 'reports/plan-after-consent.png',
        fullPage: true,
      });

      // 다음 단계가 있는지 확인
      const nextStepBtn = page.getByRole('button', { name: /next|submit|confirm|완료|신청/i });
      if (await nextStepBtn.count() > 0) {
        console.log('\n다음 단계 버튼 발견');
      }
    } else {
      console.log('"Agree and apply" 버튼 없음');
    }
  });

  test('서류 제출 페이지 분석', async ({ page }) => {
    // 서류 제출 페이지 직접 접근
    await page.goto('/m/mobile-plan/document/32');
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 서류 제출 페이지 분석');
    console.log('========================================\n');

    console.log('URL:', page.url());

    // 페이지 제목 확인
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter((h) => h.trim()).join(' | '));

    // 전체 텍스트 확인
    const bodyText = await page.locator('body').textContent();
    console.log('페이지 내용 (일부):', bodyText?.substring(0, 500));

    // Provide supporting documents 클릭
    const provideBtn = page.getByRole('button', { name: /Provide supporting documents/i });
    if (await provideBtn.isVisible()) {
      console.log('\n"Provide supporting documents" 버튼 클릭');
      await provideBtn.click();
      await page.waitForTimeout(2000);

      console.log('다음 페이지 URL:', page.url());

      const newHeadings = await page.locator('h1, h2, h3, h4').allTextContents();
      console.log('제목들:', newHeadings.filter((h) => h.trim()).join(' | '));

      // 파일 업로드 필드 확인
      const fileInputs = page.locator('input[type="file"]');
      const fileCount = await fileInputs.count();
      console.log(`파일 업로드 필드: ${fileCount}개`);

      // 입력 필드 확인
      const textInputs = page.locator('input:not([type="file"]):not([type="hidden"])');
      const inputCount = await textInputs.count();
      console.log(`텍스트 입력 필드: ${inputCount}개`);

      for (let i = 0; i < inputCount; i++) {
        const placeholder = (await textInputs.nth(i).getAttribute('placeholder')) || '';
        console.log(`  [${i}] placeholder=${placeholder}`);
      }

      // 버튼들 확인
      const buttons = await page.locator('button').allTextContents();
      console.log('버튼들:', buttons.filter((b) => b.trim()).join(', '));

      await page.screenshot({
        path: 'reports/plan-document-upload.png',
        fullPage: true,
      });
    }
  });

  test('요금제 신청 페이지 (여권 정보 확인)', async ({ page }) => {
    // 신청 페이지 직접 접근
    await page.goto('/m/mobile-plan/apply/32');
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 요금제 신청 페이지 분석');
    console.log('========================================\n');

    console.log('URL:', page.url());

    // 페이지 제목 확인
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter((h) => h.trim()).join(' | '));

    // 전체 텍스트 확인
    const bodyText = await page.locator('body').textContent();
    console.log('페이지 내용 (일부):', bodyText?.substring(0, 600));

    // 입력 필드 값 확인 (여권 정보 자동 입력됨)
    const textInputs = page.locator('input:not([type="file"]):not([type="hidden"])');
    const inputCount = await textInputs.count();
    console.log(`\n입력 필드 수: ${inputCount}`);

    for (let i = 0; i < inputCount; i++) {
      const value = await textInputs.nth(i).inputValue();
      const placeholder = (await textInputs.nth(i).getAttribute('placeholder')) || '';
      console.log(`  [${i}] value="${value}", placeholder="${placeholder}"`);
    }

    await page.screenshot({
      path: 'reports/plan-apply-passport.png',
      fullPage: true,
    });

    // Next 버튼 클릭하여 다음 단계 확인
    const nextBtn = page.getByRole('button', { name: 'Next' });
    if (await nextBtn.isVisible()) {
      console.log('\n"Next" 버튼 클릭');
      await nextBtn.click();
      await page.waitForTimeout(2000);

      console.log('다음 페이지 URL:', page.url());

      const newHeadings = await page.locator('h1, h2, h3, h4').allTextContents();
      console.log('제목들:', newHeadings.filter((h) => h.trim()).join(' | '));

      // 새 페이지 분석
      const newBodyText = await page.locator('body').textContent();
      console.log('페이지 내용 (일부):', newBodyText?.substring(0, 500));

      // 버튼들 확인
      const buttons = await page.locator('button').allTextContents();
      console.log('버튼들:', buttons.filter((b) => b.trim()).join(', '));

      await page.screenshot({
        path: 'reports/plan-after-passport.png',
        fullPage: true,
      });

      // Submit 버튼은 파일 업로드 전 비활성화
      const submitBtn = page.getByRole('button', { name: 'Submit' });
      const isSubmitEnabled = await submitBtn.isEnabled().catch(() => false);
      console.log(`\nSubmit 버튼 활성화: ${isSubmitEnabled ? '예' : '아니오 (파일 업로드 필요)'}`);
    }
  });

  test('입학허가서 업로드 페이지 분석', async ({ page }) => {
    await page.goto('/m/mobile-plan/admission-letter/32');
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 입학허가서 업로드 페이지 분석');
    console.log('========================================\n');

    // 페이지 제목 확인
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter((h) => h.trim()).join(' | '));

    // 파일 업로드 필드 찾기
    const fileInput = page.locator('input[type="file"]');
    const fileCount = await fileInput.count();
    console.log(`파일 업로드 필드: ${fileCount}개`);

    // 페이지 설명
    const bodyText = await page.locator('body').textContent();
    console.log('페이지 내용:', bodyText?.substring(0, 400));

    // 버튼 상태
    const submitBtn = page.getByRole('button', { name: 'Submit' });
    const isEnabled = await submitBtn.isEnabled().catch(() => false);
    console.log(`Submit 버튼 활성화: ${isEnabled ? '예' : '아니오'}`);

    await page.screenshot({
      path: 'reports/plan-admission-letter.png',
      fullPage: true,
    });
  });

  test('eSIM 요금제 가입 플로우', async ({ page }) => {
    await page.goto('/m/mobile-plan/esim/32');
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 eSIM 요금제 가입 플로우');
    console.log('========================================\n');

    // Apply 버튼 클릭
    const applyBtn = page.getByRole('button', { name: /Apply for a Mobile Plan/i });
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
      await page.waitForTimeout(2000);

      console.log('동의 페이지 URL:', page.url());

      // 페이지 분석
      const bodyText = await page.locator('body').textContent();
      console.log('페이지 내용 (일부):', bodyText?.substring(0, 300));

      await page.screenshot({
        path: 'reports/esim-consent-page.png',
        fullPage: true,
      });
    }
  });
});

test.describe('요금제 가입 완료 플로우 (신규 계정)', () => {
  test.describe.configure({ mode: 'serial' });

  let testEmail: string;
  const testPassword = 'qwer1234';

  test('새 계정으로 요금제 가입 시도', async ({ page }) => {
    // 새 계정 생성
    const account = await createNewTestAccount(page, '요금제 완료 테스트');
    testEmail = account.email;

    console.log(`테스트 계정: ${testEmail}`);

    // 홈에서 USIM 버튼 클릭
    const usimBtn = page.getByText('Mobile plan with free USIM');
    await expect(usimBtn).toBeVisible({ timeout: 10000 });
    await usimBtn.click();
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 신규 계정 요금제 가입 플로우');
    console.log('========================================\n');

    // 여권 등록 안내 또는 요금제 선택 페이지?
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter((h) => h.trim()).join(' | '));

    const currentUrl = page.url();
    console.log('현재 URL:', currentUrl);

    // 여권 등록 필요 메시지 확인
    const passportRequired = page.getByText(/passport|여권|register.*information/i);
    if (await passportRequired.count() > 0) {
      console.log('⚠️ 여권 등록이 먼저 필요합니다');
    }

    await page.screenshot({
      path: 'reports/plan-new-account.png',
      fullPage: true,
    });
  });
});
