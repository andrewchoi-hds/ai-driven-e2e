import { test, expect } from '@playwright/test';
import { LoginPage, HomePage, BenefitPage } from '../../pages';

/**
 * ARC (외국인등록증) 연결 플로우 탐색 테스트
 *
 * 🔍 탐색 결과 요약:
 *
 * 1. 현재 ARC 플로우 상태:
 *    - "전화번호에 외국인등록증 연결하기"는 클릭 불가 (정보 표시 전용)
 *    - ARC 전용 URL (/arc, /arc/register)은 404 오류
 *    - ARC 연결 기능은 아직 완전히 구현되지 않았거나 특정 조건 필요
 *
 * 2. 가능한 기능:
 *    - "동의하고 알림 받기" 버튼으로 ARC 심사 알림 구독 가능
 *    - 혜택 페이지에서 ARC 관련 정보 확인 가능
 *
 * 3. 사용자 상태별 예상 플로우:
 *    - new: 여권 등록 필요 → ARC 연결 불가
 *    - passport_registered: ARC 연결 안내 표시
 *    - arc_pending: 심사 중 상태 표시
 *    - arc_verified: 인증 완료, 추가 서비스 이용 가능
 *
 * 4. 제한사항:
 *    - ARC 실제 등록 플로우 자동화 불가 (기능 미구현 또는 외부 서비스)
 *    - 테스트 계정이 여권 등록 상태가 아닐 수 있음
 */
test.describe('ARC 외국인등록증 연결 플로우', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('aiqa1@aaa.com', 'qwer1234');
    await page.waitForURL('**/home');
  });

  test('혜택 페이지에서 외국인등록증 연결하기 클릭', async ({ page }) => {
    // 혜택 페이지로 이동
    const homePage = new HomePage(page);
    await homePage.navigateToBenefit();

    const benefitPage = new BenefitPage(page);
    await benefitPage.expectToBeOnBenefitPage();

    // 외국인등록증 연결하기 링크 확인 (영어/한국어)
    const arcLink = page.getByText(/전화번호에 외국인등록증 연결하기|Connect phone number to RC/i);
    await expect(arcLink).toBeVisible();

    console.log('✅ 외국인등록증 연결하기 링크 발견');

    // 클릭 전 URL 저장
    const beforeUrl = page.url();
    console.log('클릭 전 URL:', beforeUrl);

    // 클릭
    await arcLink.click();
    await page.waitForTimeout(2000);

    // 클릭 후 URL 확인
    const afterUrl = page.url();
    console.log('클릭 후 URL:', afterUrl);

    // 페이지 내용 분석
    const pageContent = await page.content();

    // ARC 관련 키워드 확인
    const arcKeywords = [
      '외국인등록증',
      'ARC',
      'Alien Registration',
      'RC',
      'Residence Card',
      '심사',
      '연결',
      '등록',
    ];

    console.log('\n📋 페이지 내 ARC 관련 키워드:');
    for (const keyword of arcKeywords) {
      if (pageContent.includes(keyword)) {
        console.log(`  ✓ "${keyword}" 발견`);
      }
    }

    await page.screenshot({
      path: 'reports/arc-flow-step1.png',
      fullPage: true,
    });
  });

  test('ARC 페이지 URL 패턴 탐색', async ({ page }) => {
    // 가능한 ARC 관련 URL 패턴 테스트
    const possibleUrls = [
      '/arc',
      '/m/arc',
      '/arc/register',
      '/m/arc/register',
      '/foreigner-id',
      '/m/foreigner-id',
      '/residence-card',
      '/m/residence-card',
      '/alien-registration',
      '/m/alien-registration',
    ];

    console.log('🔍 ARC 관련 URL 탐색:\n');

    for (const url of possibleUrls) {
      try {
        const response = await page.goto(url, { timeout: 5000 });
        const status = response?.status() || 'no response';
        const finalUrl = page.url();

        if (status === 200 && !finalUrl.includes('/login') && !finalUrl.includes('/404')) {
          console.log(`✅ ${url} → ${status} (${finalUrl})`);

          // 스크린샷 저장
          await page.screenshot({
            path: `reports/arc-url-${url.replace(/\//g, '-')}.png`,
            fullPage: true,
          });
        } else {
          console.log(`❌ ${url} → ${status} (redirect: ${finalUrl})`);
        }
      } catch (error) {
        console.log(`❌ ${url} → error`);
      }
    }
  });

  test('마이페이지에서 ARC FAQ 확인', async ({ page }) => {
    // 마이페이지로 이동
    await page.goto('/my');
    await page.waitForLoadState('networkidle');

    // FAQ 섹션 찾기
    const faqSection = page.getByText('자주 묻는 질문');
    if (await faqSection.isVisible()) {
      console.log('✅ FAQ 섹션 발견');
      await faqSection.click();
      await page.waitForTimeout(1000);
    }

    // ARC 관련 FAQ 확인
    const arcFaqQuestions = [
      'Am I eligible to apply for a RC(ARC)?',
      'Where and how can I apply for a RC(ARC)?',
      '외국인등록증',
      'ARC',
    ];

    console.log('\n📋 ARC 관련 FAQ:');
    for (const question of arcFaqQuestions) {
      const faqItem = page.getByText(question, { exact: false });
      if (await faqItem.count() > 0) {
        console.log(`  ✓ "${question}" 발견`);
      }
    }

    await page.screenshot({
      path: 'reports/arc-faq.png',
      fullPage: true,
    });
  });

  test('홈 화면에서 ARC 관련 UI 확인', async ({ page }) => {
    // 홈 화면
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // ARC 관련 요소 찾기
    const arcElements = [
      page.getByText('외국인등록증'),
      page.getByText('ARC', { exact: true }),
      page.getByText('Alien Registration'),
      page.getByText('심사 중'),
      page.getByText('외국인등록증 연결'),
    ];

    console.log('🏠 홈 화면 ARC 관련 요소:');
    for (const element of arcElements) {
      if (await element.count() > 0) {
        const text = await element.first().textContent();
        console.log(`  ✓ 발견: "${text}"`);
      }
    }

    await page.screenshot({
      path: 'reports/arc-home-check.png',
      fullPage: true,
    });
  });

  test('ARC 연결 플로우 상세 탐색', async ({ page }) => {
    // 혜택 페이지에서 시작
    await page.goto('/benefit');
    await page.waitForLoadState('networkidle');

    // 외국인등록증 연결하기 찾기
    const arcTask = page.getByText('전화번호에 외국인등록증 연결하기');

    if (await arcTask.isVisible()) {
      console.log('Step 1: 외국인등록증 연결하기 클릭');

      // 클릭 가능한 부모 요소 찾기
      const clickableParent = arcTask.locator('..');
      await clickableParent.click();
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      console.log('  현재 URL:', currentUrl);

      // 모달이 열렸는지 확인
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"], [class*="popup"]');
      if (await modal.count() > 0) {
        console.log('  ✅ 모달 발견');

        await page.screenshot({
          path: 'reports/arc-modal.png',
          fullPage: true,
        });

        // 모달 내 버튼들 확인
        const modalButtons = await modal.locator('button').all();
        console.log(`  모달 내 버튼 수: ${modalButtons.length}`);

        for (const btn of modalButtons) {
          const btnText = await btn.textContent();
          console.log(`    - 버튼: "${btnText}"`);
        }
      }

      // 페이지 내 모든 form 요소 확인
      const forms = await page.locator('form').all();
      if (forms.length > 0) {
        console.log(`\n📝 Form 요소 ${forms.length}개 발견`);

        for (let i = 0; i < forms.length; i++) {
          const inputs = await forms[i].locator('input').all();
          console.log(`  Form ${i + 1}: ${inputs.length}개 입력 필드`);
        }
      }

      // 현재 페이지의 주요 텍스트 요소 출력
      const headings = await page.locator('h1, h2, h3').allTextContents();
      console.log('\n📌 페이지 헤딩:');
      for (const heading of headings) {
        if (heading.trim()) {
          console.log(`  - ${heading.trim()}`);
        }
      }
    }

    await page.screenshot({
      path: 'reports/arc-flow-detail.png',
      fullPage: true,
    });
  });

  test('알림 구독 기능 확인', async ({ page }) => {
    await page.goto('/benefit');
    await page.waitForLoadState('networkidle');

    // 알림 구독 카드 확인
    const notificationCard = page.getByText('외국인등록증 심사가 진행되면');
    const subscribeButton = page.getByRole('button', { name: '동의하고 알림 받기' });

    if (await notificationCard.isVisible()) {
      console.log('✅ 알림 안내 카드 발견');
      console.log('   "외국인등록증 심사가 진행되면 알림을 받을 수 있습니다"');
    }

    if (await subscribeButton.isVisible()) {
      console.log('✅ 알림 구독 버튼 발견');

      // 버튼 클릭 시 동작 확인
      console.log('\n알림 구독 버튼 클릭...');
      await subscribeButton.click();
      await page.waitForTimeout(2000);

      // 결과 확인
      const afterClick = page.url();
      console.log('클릭 후 URL:', afterClick);

      // 성공 메시지 또는 변경된 UI 확인
      const successIndicators = [
        page.getByText('구독 완료'),
        page.getByText('알림 설정 완료'),
        page.getByText('Success'),
        page.getByText('완료'),
      ];

      for (const indicator of successIndicators) {
        if (await indicator.isVisible()) {
          const text = await indicator.textContent();
          console.log(`✅ 성공 표시: "${text}"`);
        }
      }

      await page.screenshot({
        path: 'reports/arc-notification-subscribe.png',
        fullPage: true,
      });
    }
  });

  test('/arc 페이지 상세 분석', async ({ page }) => {
    await page.goto('/arc');
    await page.waitForLoadState('networkidle');

    console.log('📄 /arc 페이지 분석\n');
    console.log('URL:', page.url());

    // 페이지 제목
    const title = await page.title();
    console.log('Title:', title);

    // 헤딩 요소
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('\n📌 헤딩:');
    for (const h of headings) {
      if (h.trim()) console.log(`  - ${h.trim()}`);
    }

    // 버튼 요소
    const buttons = await page.locator('button').allTextContents();
    console.log('\n🔘 버튼:');
    for (const btn of buttons) {
      if (btn.trim()) console.log(`  - ${btn.trim()}`);
    }

    // 입력 필드
    const inputs = await page.locator('input').all();
    console.log(`\n📝 입력 필드: ${inputs.length}개`);
    for (const input of inputs) {
      const placeholder = await input.getAttribute('placeholder');
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      console.log(`  - type="${type}", name="${name}", placeholder="${placeholder}"`);
    }

    // 링크
    const links = await page.locator('a[href]').all();
    console.log(`\n🔗 링크: ${links.length}개`);

    await page.screenshot({
      path: 'reports/arc-main-page.png',
      fullPage: true,
    });
  });

  test('/arc/register 페이지 상세 분석', async ({ page }) => {
    await page.goto('/arc/register');
    await page.waitForLoadState('networkidle');

    console.log('📄 /arc/register 페이지 분석\n');
    console.log('URL:', page.url());

    // 헤딩 요소
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('\n📌 헤딩:');
    for (const h of headings) {
      if (h.trim()) console.log(`  - ${h.trim()}`);
    }

    // 버튼 요소
    const buttons = await page.locator('button').allTextContents();
    console.log('\n🔘 버튼:');
    for (const btn of buttons) {
      if (btn.trim()) console.log(`  - ${btn.trim()}`);
    }

    // 입력 필드
    const inputs = await page.locator('input').all();
    console.log(`\n📝 입력 필드: ${inputs.length}개`);
    for (const input of inputs) {
      const placeholder = await input.getAttribute('placeholder');
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      console.log(`  - type="${type}", name="${name}", placeholder="${placeholder}"`);
    }

    // Form 요소
    const forms = await page.locator('form').all();
    console.log(`\n📋 Form: ${forms.length}개`);

    // 파일 업로드 확인
    const fileInputs = await page.locator('input[type="file"]').all();
    if (fileInputs.length > 0) {
      console.log(`\n📁 파일 업로드 필드: ${fileInputs.length}개`);
    }

    await page.screenshot({
      path: 'reports/arc-register-page.png',
      fullPage: true,
    });
  });

  test('ARC 등록 폼 입력 필드 탐색', async ({ page }) => {
    // /arc 또는 /arc/register 에서 실제 폼을 찾기
    const arcUrls = ['/arc', '/arc/register', '/foreigner-id'];

    for (const url of arcUrls) {
      console.log(`\n=== ${url} 페이지 폼 분석 ===`);
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // 현재 페이지에서 주요 UI 요소 확인
      const mainContent = await page.locator('main, [role="main"], .main-content, #root > div').first();

      if (await mainContent.count() > 0) {
        // 주요 텍스트 내용 출력
        const textContent = await mainContent.textContent();
        const words = textContent?.split(/\s+/).slice(0, 50).join(' ') || '';
        console.log('첫 50단어:', words.substring(0, 300));
      }

      // ARC 번호 입력 필드 찾기
      const arcNumberInput = page.locator('input[placeholder*="ARC"], input[placeholder*="외국인등록"], input[name*="arc"], input[name*="foreigner"]');
      if (await arcNumberInput.count() > 0) {
        console.log('✅ ARC 번호 입력 필드 발견');
      }

      // 제출 버튼 찾기
      const submitBtn = page.locator('button[type="submit"], button:has-text("등록"), button:has-text("제출"), button:has-text("Register"), button:has-text("Submit")');
      if (await submitBtn.count() > 0) {
        console.log('✅ 제출 버튼 발견');
      }
    }
  });

  test('ARC 심사 상태 확인 페이지 탐색', async ({ page }) => {
    // 심사 상태 관련 URL 탐색
    const statusUrls = [
      '/arc/status',
      '/arc/check',
      '/my/arc',
      '/my/arc-status',
    ];

    console.log('🔍 ARC 심사 상태 페이지 탐색:\n');

    for (const url of statusUrls) {
      try {
        const response = await page.goto(url, { timeout: 5000 });
        const status = response?.status() || 'no response';
        const finalUrl = page.url();

        if (status === 200 && !finalUrl.includes('/login') && !finalUrl.includes('/404')) {
          console.log(`✅ ${url} → 유효한 페이지`);
          console.log(`   최종 URL: ${finalUrl}`);

          // 페이지 내용 확인
          const headings = await page.locator('h1, h2').allTextContents();
          if (headings.length > 0) {
            console.log(`   헤딩: ${headings[0]}`);
          }
        } else {
          console.log(`❌ ${url} → 미존재 또는 리다이렉트`);
        }
      } catch {
        console.log(`❌ ${url} → 접근 불가`);
      }
    }
  });

  test('외국인등록증 연결하기 상세 클릭 분석', async ({ page }) => {
    await page.goto('/benefit');
    await page.waitForLoadState('networkidle');

    console.log('🔍 외국인등록증 연결하기 요소 상세 분석\n');

    // 외국인등록증 텍스트 요소 찾기
    const arcText = page.getByText('전화번호에 외국인등록증 연결하기');

    if (await arcText.isVisible()) {
      // 요소 정보 출력
      const element = arcText.first();
      const tagName = await element.evaluate(el => el.tagName);
      const classList = await element.evaluate(el => el.className);
      const parentTag = await element.evaluate(el => el.parentElement?.tagName);
      const parentClass = await element.evaluate(el => el.parentElement?.className);
      const grandparentTag = await element.evaluate(el => el.parentElement?.parentElement?.tagName);

      console.log('📌 요소 정보:');
      console.log(`  태그: ${tagName}`);
      console.log(`  클래스: ${classList}`);
      console.log(`  부모 태그: ${parentTag}`);
      console.log(`  부모 클래스: ${parentClass}`);
      console.log(`  조부모 태그: ${grandparentTag}`);

      // 클릭 가능한 부모 요소들 찾기
      const clickableParent = await element.evaluate(el => {
        let current = el.parentElement;
        while (current) {
          const role = current.getAttribute('role');
          const onclick = current.getAttribute('onclick');
          const cursor = window.getComputedStyle(current).cursor;
          if (role === 'button' || onclick || cursor === 'pointer' || current.tagName === 'A' || current.tagName === 'BUTTON') {
            return {
              tag: current.tagName,
              role: role,
              className: current.className,
              href: current.getAttribute('href'),
              hasOnclick: !!onclick,
            };
          }
          current = current.parentElement;
        }
        return null;
      });

      if (clickableParent) {
        console.log('\n🖱️ 클릭 가능한 부모 요소:');
        console.log(`  태그: ${clickableParent.tag}`);
        console.log(`  role: ${clickableParent.role}`);
        console.log(`  클래스: ${clickableParent.className}`);
        console.log(`  href: ${clickableParent.href}`);
        console.log(`  onclick: ${clickableParent.hasOnclick}`);
      }

      // 이벤트 리스너 확인을 위한 클릭 테스트
      console.log('\n🧪 클릭 테스트...');

      // 네트워크 요청 모니터링
      const requests: string[] = [];
      page.on('request', req => {
        if (req.resourceType() === 'fetch' || req.resourceType() === 'xhr') {
          requests.push(req.url());
        }
      });

      // 클릭 전 상태
      const beforeUrl = page.url();

      // 클릭
      await element.click();
      await page.waitForTimeout(2000);

      // 클릭 후 상태
      const afterUrl = page.url();

      console.log(`  클릭 전 URL: ${beforeUrl}`);
      console.log(`  클릭 후 URL: ${afterUrl}`);

      if (requests.length > 0) {
        console.log('\n📡 발생한 API 요청:');
        for (const req of requests) {
          console.log(`  - ${req}`);
        }
      }

      // 모달 확인
      const modals = await page.locator('[role="dialog"], [role="alertdialog"], .modal, [class*="modal"], [class*="popup"], [class*="overlay"]').all();
      if (modals.length > 0) {
        console.log(`\n🪟 모달 ${modals.length}개 발견`);
        for (const modal of modals) {
          if (await modal.isVisible()) {
            const modalText = await modal.textContent();
            console.log(`  내용: ${modalText?.substring(0, 200)}`);
          }
        }
      }

      // Toast 메시지 확인
      const toasts = await page.locator('[role="status"], [role="alert"], .toast, [class*="toast"], [class*="snackbar"]').all();
      if (toasts.length > 0) {
        console.log(`\n🔔 Toast ${toasts.length}개 발견`);
        for (const toast of toasts) {
          if (await toast.isVisible()) {
            const toastText = await toast.textContent();
            console.log(`  내용: ${toastText}`);
          }
        }
      }

      await page.screenshot({
        path: 'reports/arc-link-click-result.png',
        fullPage: true,
      });
    }
  });

  test('혜택 페이지 전체 카드 분석', async ({ page }) => {
    await page.goto('/benefit');
    await page.waitForLoadState('networkidle');

    console.log('📋 혜택 페이지 전체 카드/섹션 분석\n');

    // 모든 카드 형태의 요소 찾기
    const cardSelectors = [
      '[class*="card"]',
      '[class*="Card"]',
      '[class*="item"]',
      '[class*="service"]',
      '[class*="task"]',
    ];

    for (const selector of cardSelectors) {
      const cards = await page.locator(selector).all();
      if (cards.length > 0) {
        console.log(`\n${selector}: ${cards.length}개`);
        for (let i = 0; i < Math.min(cards.length, 5); i++) {
          const text = await cards[i].textContent();
          if (text && text.trim().length < 200) {
            console.log(`  ${i + 1}. ${text.trim().substring(0, 100)}`);
          }
        }
      }
    }

    // 버튼들의 상태 확인
    console.log('\n🔘 버튼 상태 분석:');
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      const isDisabled = await btn.isDisabled();
      const isVisible = await btn.isVisible();
      if (text && text.trim() && isVisible) {
        console.log(`  - "${text.trim()}" (disabled: ${isDisabled})`);
      }
    }
  });

  test('사용자 상태별 ARC 플로우 차이 확인', async ({ page }) => {
    console.log('📊 현재 사용자의 ARC 관련 상태 확인\n');

    // 홈 화면에서 상태 확인
    await page.goto('/home');
    await page.waitForLoadState('networkidle');

    // 여권 등록 상태 확인
    const passportCard = page.getByText('여권을 등록해 주세요');
    const arcCard = page.getByText('외국인등록증');

    if (await passportCard.isVisible()) {
      console.log('📛 현재 상태: 여권 미등록 (new user)');
      console.log('   → 외국인등록증 연결 불가 (여권 등록 선행 필요)');
    } else if (await arcCard.isVisible()) {
      const arcText = await arcCard.textContent();
      console.log(`📛 현재 상태: ${arcText}`);
    } else {
      console.log('📛 현재 상태: 확인 필요');
    }

    // 마이페이지에서 상세 확인
    await page.goto('/my');
    await page.waitForLoadState('networkidle');

    const profileSection = page.locator('[class*="profile"], [class*="user-info"], [class*="status"]');
    if (await profileSection.count() > 0) {
      const profileText = await profileSection.first().textContent();
      console.log('\n📋 프로필 섹션:');
      console.log(`   ${profileText?.substring(0, 200)}`);
    }

    await page.screenshot({
      path: 'reports/arc-user-status.png',
      fullPage: true,
    });
  });

  test('외국인등록증 연결하기 클릭 후 Toast 메시지 캡처', async ({ page }) => {
    await page.goto('/benefit');
    await page.waitForLoadState('networkidle');

    console.log('🔍 Toast 메시지 상세 분석\n');

    const arcText = page.getByText('전화번호에 외국인등록증 연결하기');

    // Toast 모니터링 설정
    let toastContent = '';

    // DOM 변경 감시
    await page.evaluate(() => {
      window.__toastMessages = [];
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const text = node.textContent || '';
              if (text && text.length > 0 && text.length < 500) {
                window.__toastMessages.push(text);
              }
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    // 클릭
    await arcText.click();
    await page.waitForTimeout(3000);

    // Toast 메시지 수집
    const messages = await page.evaluate(() => window.__toastMessages || []);
    console.log('📬 감지된 메시지:');
    for (const msg of messages) {
      console.log(`  - "${msg.substring(0, 200)}"`);
    }

    // 현재 화면의 모든 텍스트 중 새로 나타난 것 확인
    const allText = await page.locator('body').textContent();

    // ARC 관련 메시지 키워드
    const arcKeywords = ['연결', '등록', '외국인', 'ARC', '심사', '승인', '거부', '오류', '에러', '완료', '실패'];
    const foundKeywords = arcKeywords.filter(kw => allText?.includes(kw));
    console.log('\n🔑 페이지에서 발견된 키워드:', foundKeywords.join(', '));

    await page.screenshot({
      path: 'reports/arc-toast-capture.png',
      fullPage: true,
    });
  });

  test('혜택 페이지 모든 클릭 가능 요소 탐색', async ({ page }) => {
    await page.goto('/benefit');
    await page.waitForLoadState('networkidle');

    console.log('🖱️ 혜택 페이지 클릭 가능 요소 분석\n');

    // 클릭 가능한 모든 요소 찾기
    const clickables = await page.evaluate(() => {
      const elements: Array<{
        tag: string;
        text: string;
        className: string;
        href: string | null;
        role: string | null;
      }> = [];

      document.querySelectorAll('a, button, [role="button"], [onclick], [class*="clickable"], [class*="btn"]').forEach((el) => {
        const text = el.textContent?.trim().substring(0, 50) || '';
        if (text) {
          elements.push({
            tag: el.tagName,
            text: text,
            className: el.className.toString().substring(0, 50),
            href: el.getAttribute('href'),
            role: el.getAttribute('role'),
          });
        }
      });

      return elements;
    });

    console.log(`발견된 클릭 가능 요소: ${clickables.length}개\n`);

    for (const el of clickables) {
      const hrefInfo = el.href ? ` → ${el.href}` : '';
      console.log(`  [${el.tag}] "${el.text}"${hrefInfo}`);
    }
  });

  test('외국인등록증 관련 카드 컴포넌트 상세 분석', async ({ page }) => {
    await page.goto('/benefit');
    await page.waitForLoadState('networkidle');

    console.log('📦 외국인등록증 카드 컴포넌트 분석\n');

    // 외국인등록증 텍스트가 포함된 모든 요소의 부모 컨테이너 찾기
    const arcContainers = await page.evaluate(() => {
      const containers: Array<{
        html: string;
        classes: string;
        children: string[];
      }> = [];

      // 외국인등록증 텍스트를 포함하는 요소들 찾기
      const treeWalker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            return node.textContent?.includes('외국인등록증')
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        }
      );

      const textNodes: Node[] = [];
      while (treeWalker.nextNode()) {
        textNodes.push(treeWalker.currentNode);
      }

      // 각 텍스트 노드의 상위 컨테이너 분석
      textNodes.forEach((textNode) => {
        let parent = textNode.parentElement;
        // 상위 3단계까지 올라가기
        for (let i = 0; i < 3 && parent; i++) {
          parent = parent.parentElement;
        }

        if (parent) {
          const children = Array.from(parent.children).map(c => c.tagName + (c.className ? `.${c.className.split(' ')[0]}` : ''));
          containers.push({
            html: parent.outerHTML.substring(0, 500),
            classes: parent.className,
            children: children.slice(0, 5),
          });
        }
      });

      return containers.slice(0, 3); // 처음 3개만
    });

    for (let i = 0; i < arcContainers.length; i++) {
      console.log(`\n카드 ${i + 1}:`);
      console.log(`  클래스: ${arcContainers[i].classes}`);
      console.log(`  자식요소: ${arcContainers[i].children.join(', ')}`);
    }
  });
});
