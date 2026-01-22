import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  createNewTestAccount,
  loginWithAccount,
  updateAccountState,
} from '../../fixtures/test-account-manager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PASSPORT_IMAGE = path.join(__dirname, '../../fixtures/files/test-passport.png');

/**
 * 학교 선택 플로우 테스트
 *
 * 방법 1: 이전에 여권 등록한 계정으로 로그인 시 학교 선택 페이지 확인
 * 방법 2: 새 계정으로 여권 등록 후 바로 학교 선택 페이지 이동 확인
 */

test.describe('학교 선택 - 기존 계정', () => {
  test('여권 등록 완료 계정으로 로그인 시 학교 선택 페이지', async ({ page }) => {
    // 여권 등록했던 계정으로 로그인
    // test_ai_4@aaa.com은 여권 등록 진행했던 계정
    await loginWithAccount(page, 'test_ai_4@aaa.com', 'qwer1234');

    console.log('\n========================================');
    console.log('📋 여권 등록 계정 로그인 후 상태 확인');
    console.log('========================================\n');

    console.log('로그인 후 URL:', page.url());

    // 현재 페이지 분석
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter(h => h.trim()).join(' | '));

    const buttons = await page.locator('button').allTextContents();
    console.log('버튼들:', buttons.filter(b => b.trim()).join(', '));

    // 학교 선택 관련 요소 확인
    const schoolRelated = await page.locator('text=/school|학교|university|대학/i').count();
    console.log(`학교 관련 텍스트: ${schoolRelated}개`);

    // 스크린샷
    await page.screenshot({
      path: 'reports/school-after-passport-login.png',
      fullPage: true,
    });

    // Register Information 버튼 존재 여부 확인
    const registerBtn = page.getByText('Register Information');
    const hasRegisterBtn = await registerBtn.isVisible().catch(() => false);
    console.log(`Register Information 버튼: ${hasRegisterBtn ? '있음' : '없음'}`);

    // 홈 페이지에 학교 선택 카드가 있는지 확인
    if (page.url().includes('/home')) {
      const selectSchoolBtn = page.getByText(/Select.*School|학교.*선택/i);
      if (await selectSchoolBtn.count() > 0) {
        console.log('✅ 학교 선택 버튼 발견');
        await selectSchoolBtn.first().click();
        await page.waitForTimeout(2000);

        console.log('학교 선택 페이지 URL:', page.url());
        await page.screenshot({
          path: 'reports/school-selection-page.png',
          fullPage: true,
        });
      }
    }
  });

  test('aiqa1 계정으로 학교 선택 관련 요소 탐색', async ({ page }) => {
    await loginWithAccount(page, 'aiqa1@aaa.com', 'qwer1234');

    console.log('\n========================================');
    console.log('📋 aiqa1 계정 홈 페이지 분석');
    console.log('========================================\n');

    // 홈 페이지의 모든 카드/버튼 분석
    const allButtons = await page.locator('button').all();
    console.log(`버튼 수: ${allButtons.length}`);

    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const text = await allButtons[i].textContent();
      if (text && text.trim()) {
        console.log(`  [${i}] ${text.trim()}`);
      }
    }

    // 학교 관련 링크/버튼 찾기
    const schoolButtons = await page.locator('button:has-text("school"), button:has-text("School"), button:has-text("학교")').all();
    console.log(`학교 관련 버튼: ${schoolButtons.length}개`);

    // 카드 형태의 요소 찾기
    const cards = await page.locator('[class*="card"], [class*="Card"]').all();
    console.log(`카드 수: ${cards.length}`);

    await page.screenshot({
      path: 'reports/aiqa1-home-analysis.png',
      fullPage: true,
    });
  });
});

test.describe('학교 선택 - 신규 가입 후 연속 플로우', () => {
  test.describe.configure({ mode: 'serial' });

  let testEmail: string;
  const testPassword = 'qwer1234';

  test('새 계정 생성', async ({ page }) => {
    const account = await createNewTestAccount(page, '학교 선택 테스트');
    testEmail = account.email;

    console.log(`테스트 계정: ${testEmail}`);
    await expect(page).toHaveURL(/\/(home|login)/);
  });

  test('여권 등록 완료', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);

    // 여권 등록 페이지로 이동
    const registerBtn = page.getByText('Register Information');
    await expect(registerBtn).toBeVisible({ timeout: 10000 });
    await registerBtn.click();
    await page.waitForTimeout(2000);

    // Step 1: 안내 페이지에서 next
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(2000);

    // Step 2: 파일 업로드
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 5000 });
    await fileInput.setInputFiles(TEST_PASSPORT_IMAGE);

    console.log('✅ 여권 이미지 업로드 완료');
    await page.waitForTimeout(2000);

    // Step 3: 여권 정보 수동 입력 (OCR 인식 안 될 경우)
    console.log('여권 정보 입력 중...');

    // 텍스트 input 필드만 찾기 (file input 제외)
    const textInputs = page.locator('input:not([type="file"])');
    const inputCount = await textInputs.count();
    console.log(`  텍스트 입력 필드 수: ${inputCount}`);

    // 각 필드 순서: 0=Name, 1=Number, 2=Nationality, 3=DOB
    if (inputCount >= 1) {
      await textInputs.nth(0).fill('TEST USER');
      console.log('  - 이름 입력 완료');
    }

    if (inputCount >= 2) {
      await textInputs.nth(1).fill('M12345678');
      console.log('  - 여권번호 입력 완료');
    }

    if (inputCount >= 3) {
      await textInputs.nth(2).fill('KOR');
      console.log('  - 국적코드 입력 완료');
    }

    if (inputCount >= 4) {
      await textInputs.nth(3).fill('1990.01.01');
      console.log('  - 생년월일 입력 완료');
    }

    await page.waitForTimeout(1000);

    // 업로드 후 스크린샷
    await page.screenshot({
      path: 'reports/school-passport-filled.png',
      fullPage: true,
    });

    // next 버튼 클릭
    const nextBtn = page.getByRole('button', { name: /next/i });
    if (await nextBtn.isEnabled()) {
      console.log('next 버튼 활성화됨 - 클릭');
      await nextBtn.click();
      await page.waitForTimeout(3000);

      // 다음 페이지 확인
      console.log('현재 URL:', page.url());

      const headings = await page.locator('h1, h2, h3, h4').allTextContents();
      console.log('제목들:', headings.filter(h => h.trim()).join(' | '));

      await page.screenshot({
        path: 'reports/school-after-passport.png',
        fullPage: true,
      });
    } else {
      console.log('next 버튼 비활성화 - 폼 검증 오류 확인');

      // 에러 메시지 확인
      const errors = await page.locator('[class*="error"], [class*="Error"]').allTextContents();
      const pleaseEnterErrors = await page.getByText(/Please enter/i).allTextContents();
      console.log('에러 메시지:', [...errors, ...pleaseEnterErrors].filter(e => e.trim()).join(' | '));
    }
  });

  test('학교 선택 페이지 확인', async ({ page }) => {
    await loginWithAccount(page, testEmail, testPassword);

    console.log('\n========================================');
    console.log('📋 여권 등록 후 학교 선택 페이지 확인');
    console.log('========================================\n');

    console.log('로그인 후 URL:', page.url());

    // 페이지 분석
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter(h => h.trim()).join(' | '));

    // 학교 선택 관련 요소 찾기
    const schoolText = page.locator('text=/school|학교|university|대학|institution/i');
    if (await schoolText.count() > 0) {
      console.log('✅ 학교 관련 텍스트 발견');

      // 학교 선택 옵션들 확인
      const options = await page.locator('select option, [role="option"], [class*="option"]').allTextContents();
      console.log('옵션들:', options.filter(o => o.trim()).slice(0, 10).join(', '));
    }

    // 검색 입력 필드 확인
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="검색"]');
    if (await searchInput.count() > 0) {
      console.log('✅ 검색 필드 발견');
    }

    await page.screenshot({
      path: 'reports/school-selection-flow.png',
      fullPage: true,
    });

    updateAccountState(testEmail, 'passport_registered');
  });
});

test.describe('학교 선택 페이지 상세 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // test_ai_16 계정 사용 (여권 등록 완료 상태)
    await loginWithAccount(page, 'test_ai_16@aaa.com', 'qwer1234');
  });

  test('학교 선택 페이지 직접 접근', async ({ page }) => {
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 학교 선택 페이지 분석');
    console.log('========================================\n');

    // 제목 확인
    await expect(page.getByText('Please select a school')).toBeVisible();

    // 검색 필드 확인
    const searchField = page.locator('input[placeholder*="Find"], input[placeholder*="University"]');
    await expect(searchField).toBeVisible();

    // 대학 카드 수 확인
    const universityCards = page.locator('button:has-text("University"), button:has-text("대학")');
    const cardCount = await universityCards.count();
    console.log(`대학 카드 수: ${cardCount}`);

    // 일부 대학 이름 확인
    const universities = ['Yonsei University', 'Korea University', 'Seoul National University'];
    for (const uni of universities) {
      const uniBtn = page.getByText(uni);
      if (await uniBtn.count() > 0) {
        console.log(`✅ ${uni} 표시됨`);
      }
    }

    // "My university isn't listed" 링크 확인 (스크롤 필요할 수 있음)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const notListedLink = page.getByText("My university isn't listed");
    const hasNotListed = await notListedLink.count() > 0;
    console.log(`"My university isn't listed" 링크: ${hasNotListed ? '있음' : '없음'}`);

    await page.screenshot({
      path: 'reports/school-selection-detail.png',
      fullPage: true,
    });
  });

  test('학교 검색 기능', async ({ page }) => {
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(2000);

    // 검색 필드에 입력
    const searchField = page.locator('input[placeholder*="Find"], input[placeholder*="University"]').first();
    await searchField.fill('Yonsei');
    await page.waitForTimeout(1000);

    console.log('검색어 "Yonsei" 입력 후 결과:');

    // 검색 결과 확인
    const yonseiBtn = page.getByText('Yonsei University');
    if (await yonseiBtn.count() > 0) {
      console.log('✅ Yonsei University 검색 결과 표시됨');
    }

    await page.screenshot({
      path: 'reports/school-search-result.png',
      fullPage: true,
    });
  });

  test('학교 선택 및 다음 단계', async ({ page }) => {
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(2000);

    // 연세대학교 선택
    const yonseiBtn = page.getByText('Yonsei University').first();
    if (await yonseiBtn.count() > 0) {
      await yonseiBtn.click();
      await page.waitForTimeout(2000);

      console.log('Yonsei University 선택 후 URL:', page.url());

      const headings = await page.locator('h1, h2, h3, h4').allTextContents();
      console.log('제목들:', headings.filter(h => h.trim()).join(' | '));

      await page.screenshot({
        path: 'reports/school-selected.png',
        fullPage: true,
      });
    } else {
      console.log('Yonsei University 버튼 없음');
    }
  });
});

test.describe('학교 정보 등록 페이지 탐색', () => {
  test.beforeEach(async ({ page }) => {
    // test_ai_16 계정 사용 (여권 등록 완료 상태)
    await loginWithAccount(page, 'test_ai_16@aaa.com', 'qwer1234');
  });

  test('학교 정보 등록 페이지 요소 분석', async ({ page }) => {
    // 학교 선택 페이지로 이동
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(2000);

    // 연세대학교 선택
    const yonseiBtn = page.getByText('Yonsei University').first();
    await expect(yonseiBtn).toBeVisible({ timeout: 5000 });
    await yonseiBtn.click();
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 학교 정보 등록 페이지 분석');
    console.log('========================================\n');

    console.log('URL:', page.url());

    // 제목 확인
    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log('제목들:', headings.filter(h => h.trim()).join(' | '));

    // 입력 필드 분석
    const textInputs = page.locator('input:not([type="file"]):not([type="hidden"])');
    const inputCount = await textInputs.count();
    console.log(`\n입력 필드 수: ${inputCount}`);

    for (let i = 0; i < inputCount; i++) {
      const input = textInputs.nth(i);
      const placeholder = await input.getAttribute('placeholder') || '';
      const name = await input.getAttribute('name') || '';
      const type = await input.getAttribute('type') || 'text';
      console.log(`  [${i}] type=${type}, name=${name}, placeholder=${placeholder}`);
    }

    // Select 요소 분석
    const selects = page.locator('select');
    const selectCount = await selects.count();
    console.log(`\nSelect 필드 수: ${selectCount}`);

    // 라벨 텍스트 확인
    const labels = await page.locator('label').allTextContents();
    console.log('\n라벨들:', labels.filter(l => l.trim()).join(' | '));

    // 버튼 확인
    const buttons = await page.locator('button').allTextContents();
    console.log('\n버튼들:', buttons.filter(b => b.trim()).join(', '));

    await page.screenshot({
      path: 'reports/school-info-register-page.png',
      fullPage: true,
    });
  });

  test('학교 정보 입력 폼 확인', async ({ page }) => {
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(2000);

    // 연세대학교 선택
    await page.getByText('Yonsei University').first().click();
    await page.waitForTimeout(2000);

    // "Please register the school information" 제목 확인
    await expect(page.getByText('Please register the school information')).toBeVisible();

    console.log('\n========================================');
    console.log('📋 학교 정보 입력 폼 필드 확인');
    console.log('========================================\n');

    // 각 필드 라벨 및 필수 여부 확인
    const possibleFields = [
      'Student ID',
      'Major',
      'Department',
      'Faculty',
      'Grade',
      'Semester',
      'Enrollment',
      'Start Date',
      'End Date',
      'Expected Graduation',
    ];

    for (const field of possibleFields) {
      const fieldElement = page.getByText(new RegExp(field, 'i'));
      if (await fieldElement.count() > 0) {
        console.log(`✅ ${field} 필드 발견`);
      }
    }

    // 날짜 선택기 확인
    const dateInputs = page.locator('input[type="date"], input[placeholder*="date"], input[placeholder*="Date"]');
    const dateCount = await dateInputs.count();
    console.log(`\n날짜 입력 필드: ${dateCount}개`);

    // Dropdown/Select 확인
    const dropdowns = page.locator('select, [role="listbox"], [class*="dropdown"], [class*="select"]');
    const dropdownCount = await dropdowns.count();
    console.log(`드롭다운 필드: ${dropdownCount}개`);

    await page.screenshot({
      path: 'reports/school-info-form-fields.png',
      fullPage: true,
    });
  });

  test('학교 정보 페이지 상세 구조 분석', async ({ page }) => {
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(2000);

    await page.getByText('Yonsei University').first().click();
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 학교 정보 페이지 상세 구조 분석');
    console.log('========================================\n');

    // 전체 페이지 구조 분석
    const allText = await page.locator('body').textContent();
    console.log('페이지 텍스트 (일부):', allText?.substring(0, 500));

    // 클릭 가능한 요소들 확인
    const clickableElements = page.locator('button, a, [role="button"], [onclick]');
    const clickableCount = await clickableElements.count();
    console.log(`\n클릭 가능 요소: ${clickableCount}개`);

    for (let i = 0; i < Math.min(clickableCount, 15); i++) {
      const el = clickableElements.nth(i);
      const text = await el.textContent();
      const tagName = await el.evaluate(e => e.tagName);
      if (text && text.trim()) {
        console.log(`  [${i}] <${tagName}> ${text.trim().substring(0, 50)}`);
      }
    }

    // Select 버튼 클릭해보기
    const selectBtn = page.getByRole('button', { name: 'Select' });
    if (await selectBtn.isVisible()) {
      console.log('\n"Select" 버튼 발견 - 클릭');
      await selectBtn.click();
      await page.waitForTimeout(1500);

      // 클릭 후 페이지 변화 확인
      console.log('Select 버튼 클릭 후 URL:', page.url());

      const newHeadings = await page.locator('h1, h2, h3, h4').allTextContents();
      console.log('제목들:', newHeadings.filter(h => h.trim()).join(' | '));

      // 새로운 요소 확인
      const newInputs = page.locator('input:not([type="file"]):not([type="hidden"])');
      const newInputCount = await newInputs.count();
      console.log(`입력 필드 수: ${newInputCount}`);

      // 옵션/리스트 항목 확인
      const listItems = page.locator('li, [role="option"], [class*="option"], [class*="item"]');
      const itemCount = await listItems.count();
      console.log(`리스트 항목 수: ${itemCount}`);

      if (itemCount > 0) {
        const items = await listItems.allTextContents();
        console.log('항목들 (일부):', items.filter(i => i.trim()).slice(0, 10).join(', '));
      }

      await page.screenshot({
        path: 'reports/school-info-after-select.png',
        fullPage: true,
      });
    }

    // Register 버튼 확인
    const registerBtn = page.getByRole('button', { name: 'Register' });
    const isRegisterVisible = await registerBtn.isVisible().catch(() => false);
    console.log(`\nRegister 버튼: ${isRegisterVisible ? '보임' : '안보임'}`);

    await page.screenshot({
      path: 'reports/school-info-structure.png',
      fullPage: true,
    });
  });
});

test.describe('학교 정보 등록 완전 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithAccount(page, 'test_ai_16@aaa.com', 'qwer1234');
  });

  test('학업 분류 선택 후 등록', async ({ page }) => {
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(2000);

    // 1. 학교 선택
    console.log('Step 1: 학교 선택');
    await page.getByText('Yonsei University').first().click();
    await page.waitForTimeout(2000);

    // 학교 정보 등록 페이지 확인
    await expect(page.getByText('Please register the school information')).toBeVisible();

    // 2. Classification of Studies 선택
    console.log('Step 2: 학업 분류 선택');
    const selectBtn = page.getByRole('button', { name: 'Select' });
    await expect(selectBtn).toBeVisible();
    await selectBtn.click();
    await page.waitForTimeout(1500);

    // 학업 분류 옵션 확인
    await expect(page.getByText('Please select your academic category')).toBeVisible();

    // 옵션들 확인
    const options = [
      "Bachelor's/Master's/Doctorate Degree",
      'Exchange Student',
      'Korean Language Program',
    ];

    for (const opt of options) {
      const optElement = page.getByText(opt).first();
      if (await optElement.count() > 0) {
        console.log(`✅ 옵션 발견: ${opt}`);
      }
    }

    // 첫 번째 옵션 선택 (Bachelor's/Master's/Doctorate Degree)
    const degreeOption = page.getByText("Bachelor's/Master's/Doctorate Degree").first();
    await degreeOption.click();
    await page.waitForTimeout(1500);

    console.log('학업 분류 선택 완료');

    // 3. Register 버튼 상태 확인
    console.log('Step 3: Register 버튼 확인');
    const registerBtn = page.getByRole('button', { name: 'Register' });
    const isEnabled = await registerBtn.isEnabled();
    console.log(`Register 버튼 활성화: ${isEnabled ? '예' : '아니오'}`);

    await page.screenshot({
      path: 'reports/school-info-ready-to-register.png',
      fullPage: true,
    });

    // 선택 결과 표시 확인
    const selectedText = await page.locator('body').textContent();
    if (selectedText?.includes("Bachelor's") || selectedText?.includes('D-2')) {
      console.log('✅ 선택한 학업 분류가 표시됨');
    }
  });

  test('Exchange Student 선택', async ({ page }) => {
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(2000);

    await page.getByText('Korea University').first().click();
    await page.waitForTimeout(2000);

    console.log('Korea University 선택 후 학업 분류 선택');

    const selectBtn = page.getByRole('button', { name: 'Select' });
    await selectBtn.click();
    await page.waitForTimeout(1500);

    // Exchange Student 선택
    const exchangeOption = page.getByText('Exchange Student').first();
    if (await exchangeOption.count() > 0) {
      await exchangeOption.click();
      await page.waitForTimeout(1500);
      console.log('✅ Exchange Student 선택 완료');
    }

    await page.screenshot({
      path: 'reports/school-info-exchange-student.png',
      fullPage: true,
    });
  });

  test('학교 정보 등록 완료 플로우', async ({ page }) => {
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(2000);

    console.log('\n========================================');
    console.log('📋 학교 정보 등록 완료 플로우');
    console.log('========================================\n');

    // 1. 학교 선택
    await page.getByText('Yonsei University').first().click();
    await page.waitForTimeout(2000);
    console.log('Step 1: 연세대학교 선택 완료');

    // 2. 학업 분류 선택
    const selectBtn = page.getByRole('button', { name: 'Select' });
    await selectBtn.click();
    await page.waitForTimeout(1500);

    // 옵션 목록 확인
    const listItems = await page.locator('li, [role="option"], [role="menuitem"]').allTextContents();
    console.log('옵션 목록:', listItems.filter((l) => l.trim()).join(' | '));

    // 클릭 가능한 요소 분석
    const clickableInModal = page.locator('[role="dialog"] button, [role="dialog"] li, [class*="option"], [class*="item"]');
    const clickableCount = await clickableInModal.count();
    console.log(`클릭 가능 요소: ${clickableCount}개`);

    // [role="option"] 요소 클릭 시도
    const roleOptions = page.locator('[role="option"]');
    const optionCount = await roleOptions.count();
    console.log(`role=option 요소 수: ${optionCount}`);

    // 방법 1: dispatchEvent로 클릭
    const bachelorOption = page.locator('[role="option"]:has-text("Bachelor")').first();
    if (await bachelorOption.count() > 0) {
      console.log('방법 1: dispatchEvent 사용');
      await bachelorOption.dispatchEvent('click');
      await page.waitForTimeout(1500);
    }

    // 확인
    let modalOpen = await page.getByText('Please select your academic category').isVisible().catch(() => false);
    console.log(`방법 1 후 모달: ${modalOpen ? '열림' : '닫힘'}`);

    // 방법 2: 아직 열려있으면 키보드 사용
    if (modalOpen) {
      console.log('방법 2: 키보드 네비게이션');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);

      modalOpen = await page.getByText('Please select your academic category').isVisible().catch(() => false);
      console.log(`방법 2 후 모달: ${modalOpen ? '열림' : '닫힘'}`);
    }

    // 방법 3: JavaScript로 직접 클릭 이벤트 발생
    if (modalOpen) {
      console.log('방법 3: evaluate로 JS 클릭');
      await page.evaluate(() => {
        const options = document.querySelectorAll('[role="option"]');
        if (options.length > 0) {
          (options[0] as HTMLElement).click();
        }
      });
      await page.waitForTimeout(1500);

      modalOpen = await page.getByText('Please select your academic category').isVisible().catch(() => false);
      console.log(`방법 4 후 모달: ${modalOpen ? '열림' : '닫힘'}`);
    }

    // 방법 5: 마우스 이벤트 시퀀스
    if (modalOpen) {
      console.log('방법 5: 마우스 이벤트 시퀀스');
      const box = await bachelorOption.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.up();
        await page.waitForTimeout(1500);
      }

      modalOpen = await page.getByText('Please select your academic category').isVisible().catch(() => false);
      console.log(`방법 5 후 모달: ${modalOpen ? '열림' : '닫힘'}`);
    }

    await page.screenshot({
      path: 'reports/school-select-attempts.png',
      fullPage: true,
    });

    // 최종 상태 확인
    const selectBtnText = await page.locator('button').filter({ hasText: /Select|Bachelor|D-2/ }).first().textContent();
    console.log(`최종 버튼 텍스트: ${selectBtnText?.substring(0, 50)}`);

    // ⚠️ 알려진 제한사항: 학업 분류 선택 모달이 자동화 클릭에 반응하지 않음
    // 이 UI 컴포넌트는 특정 프레임워크 이벤트 핸들러를 사용하는 것으로 보임
    // 수동 테스트 또는 추가 조사 필요
    console.log('\n⚠️ 알려진 제한사항: 학업 분류 선택 모달 자동화 불가');
    console.log('   - 다양한 클릭 방법 시도: dispatchEvent, keyboard, evaluate, mouse');
    console.log('   - 모달이 닫히지 않아 Register 버튼 비활성화 상태 유지');
    console.log('   - 수동 테스트 또는 UI 프레임워크별 특수 처리 필요');

    // 3. Register 버튼 클릭
    const registerBtn = page.getByRole('button', { name: 'Register' });
    const isEnabled = await registerBtn.isEnabled();
    console.log(`Register 버튼 활성화: ${isEnabled}`);

    if (isEnabled) {
      console.log('Step 3: Register 버튼 클릭');
      await registerBtn.click();
      await page.waitForTimeout(3000);

      // 다음 페이지 분석
      console.log('등록 후 URL:', page.url());

      const headings = await page.locator('h1, h2, h3, h4').allTextContents();
      console.log('제목들:', headings.filter((h) => h.trim()).join(' | '));

      const bodyText = await page.locator('body').textContent();
      console.log('페이지 내용 (일부):', bodyText?.substring(0, 400));

      // 버튼들 확인
      const buttons = await page.locator('button').allTextContents();
      console.log('버튼들:', buttons.filter((b) => b.trim()).join(', '));

      await page.screenshot({
        path: 'reports/school-after-register.png',
        fullPage: true,
      });

      // 성공 메시지 확인
      const successMsg = page.getByText(/success|complete|완료|등록.*완료/i);
      if (await successMsg.count() > 0) {
        console.log('✅ 등록 완료 메시지 발견');
      }

      // 홈으로 이동하는 버튼 확인
      const homeBtn = page.getByRole('button', { name: /home|홈|확인|OK/i });
      if (await homeBtn.count() > 0) {
        console.log('홈 버튼 발견 - 클릭');
        await homeBtn.first().click();
        await page.waitForTimeout(2000);

        console.log('최종 URL:', page.url());
      }
    } else {
      console.log('⚠️ Register 버튼 비활성화');

      // 왜 비활성화인지 확인
      const bodyText = await page.locator('body').textContent();
      console.log('현재 페이지:', bodyText?.substring(0, 300));
    }
  });

  test('Korean Language Program 선택', async ({ page }) => {
    await page.goto('/m/home/submit/university');
    await page.waitForTimeout(2000);

    await page.getByText('Seoul National University').first().click();
    await page.waitForTimeout(2000);

    console.log('Seoul National University 선택 후 학업 분류 선택');

    const selectBtn = page.getByRole('button', { name: 'Select' });
    await selectBtn.click();
    await page.waitForTimeout(1500);

    // Korean Language Program 선택
    const languageOption = page.getByText('Korean Language Program').first();
    if (await languageOption.count() > 0) {
      await languageOption.click();
      await page.waitForTimeout(1500);
      console.log('✅ Korean Language Program 선택 완료');
    }

    await page.screenshot({
      path: 'reports/school-info-language-program.png',
      fullPage: true,
    });
  });
});

test.describe('학교 선택 페이지 URL 직접 탐색', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox').first().fill('aiqa1@aaa.com');
    await page.getByRole('textbox').nth(1).fill('qwer1234');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/home', { timeout: 15000 });
  });

  test('학교 선택 관련 URL 탐색', async ({ page }) => {
    const possibleUrls = [
      '/m/school',
      '/m/home/school',
      '/m/home/submit/school',
      '/m/institution',
      '/m/university',
      '/m/home/select/school',
    ];

    console.log('\n========================================');
    console.log('📋 학교 선택 URL 탐색');
    console.log('========================================\n');

    for (const url of possibleUrls) {
      await page.goto(url);
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      const is404 = await page.locator('text=404').count() > 0;
      const title = await page.title();

      console.log(`${url} → ${currentUrl} (404: ${is404}, title: ${title})`);

      if (!is404 && !currentUrl.includes('404')) {
        console.log('✅ 유효한 페이지 발견!');
        await page.screenshot({
          path: `reports/school-url-${url.replace(/\//g, '-')}.png`,
          fullPage: true,
        });
      }
    }
  });
});
