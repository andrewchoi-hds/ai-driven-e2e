import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Page } from '@playwright/test';
import { SignupPage } from '../pages/SignupPage';

/**
 * 동적 테스트 계정 관리자
 *
 * 일회성 플로우 테스트를 위해 새 계정을 자동 생성하고 관리합니다.
 * - 이메일 형식: test_ai_{count}@aaa.com
 * - 비밀번호: qwer1234 (고정)
 * - 생성된 계정은 test-accounts.md에 기록됩니다.
 */

// ES Module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COUNTER_FILE = path.join(__dirname, '../../reports/account-counter.json');
const ACCOUNTS_LOG_FILE = path.join(__dirname, '../../reports/test-accounts.md');
const DEFAULT_PASSWORD = 'qwer1234';
const VERIFICATION_CODE = '000000'; // QA 환경 인증 코드

interface AccountCounter {
  lastCount: number;
  updatedAt: string;
}

interface CreatedAccount {
  email: string;
  password: string;
  createdAt: string;
  purpose: string;
  state?: string;
}

/**
 * 현재 카운터 값을 읽습니다.
 */
function readCounter(): number {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8')) as AccountCounter;
      return data.lastCount;
    }
  } catch (error) {
    console.warn('카운터 파일 읽기 실패, 0부터 시작합니다.');
  }
  return 0;
}

/**
 * 카운터 값을 저장합니다.
 */
function saveCounter(count: number): void {
  const data: AccountCounter = {
    lastCount: count,
    updatedAt: new Date().toISOString(),
  };

  // reports 디렉토리 확인
  const reportsDir = path.dirname(COUNTER_FILE);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));
}

/**
 * 생성된 계정을 문서에 기록합니다.
 */
function logAccountToDocument(account: CreatedAccount): void {
  const logEntry = `| ${account.email} | ${account.password} | ${account.createdAt} | ${account.purpose} | ${account.state || 'new'} |\n`;

  // 파일이 없으면 헤더와 함께 생성
  if (!fs.existsSync(ACCOUNTS_LOG_FILE)) {
    const header = `# 테스트 계정 목록

**자동 생성된 테스트 계정들입니다.**

> 이 계정들은 일회성 플로우 테스트(여권 등록, 요금제 가입 등)에 사용됩니다.
> 나중에 다른 테스트에 재활용할 수 있습니다.

---

## 계정 목록

| 이메일 | 비밀번호 | 생성일시 | 용도 | 상태 |
|--------|----------|----------|------|------|
`;
    fs.writeFileSync(ACCOUNTS_LOG_FILE, header);
  }

  fs.appendFileSync(ACCOUNTS_LOG_FILE, logEntry);
}

/**
 * 다음 계정 이메일을 생성합니다.
 */
export function getNextAccountEmail(): string {
  const currentCount = readCounter();
  const nextCount = currentCount + 1;
  saveCounter(nextCount);
  return `test_ai_${nextCount}@aaa.com`;
}

/**
 * 현재 카운터 값을 확인합니다 (카운터 증가 없이).
 */
export function peekNextAccountNumber(): number {
  return readCounter() + 1;
}

/**
 * 새 계정을 생성하고 기록합니다.
 *
 * @param page Playwright Page 객체
 * @param purpose 계정 생성 용도 (예: '여권 등록 테스트')
 * @returns 생성된 계정 정보
 */
export async function createNewTestAccount(
  page: Page,
  purpose: string
): Promise<CreatedAccount> {
  const email = getNextAccountEmail();
  const password = DEFAULT_PASSWORD;
  const createdAt = new Date().toISOString().split('T')[0];

  // SignupPage POM 사용
  const signupPage = new SignupPage(page);
  await signupPage.goto();

  // 전체 회원가입 플로우 실행
  // 1. 이메일 입력 → 2. 인증코드(000000) → 3. 비밀번호 → 4. 약관동의 → 완료
  await signupPage.completeSignup(email, password, VERIFICATION_CODE);

  const account: CreatedAccount = {
    email,
    password,
    createdAt,
    purpose,
    state: 'new',
  };

  // 문서에 기록
  logAccountToDocument(account);

  console.log(`✅ 새 계정 생성: ${email} (용도: ${purpose})`);

  return account;
}

/**
 * 기존 계정으로 로그인합니다.
 */
export async function loginWithAccount(
  page: Page,
  email: string,
  password: string = DEFAULT_PASSWORD
): Promise<void> {
  await page.goto('/login');
  await page.waitForTimeout(2000);

  const emailInput = page.getByRole('textbox').first();
  const passwordInput = page.getByRole('textbox').nth(1);

  await emailInput.fill(email);
  await passwordInput.fill(password);

  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/home', { timeout: 15000 });
}

/**
 * 계정 상태를 업데이트합니다 (문서에 기록).
 */
export function updateAccountState(email: string, newState: string): void {
  console.log(`📝 계정 상태 업데이트: ${email} → ${newState}`);
  // 실제 구현에서는 파일을 파싱하여 해당 라인을 업데이트
  // 간단한 버전에서는 새 로그 항목 추가
  const logEntry = `\n> **상태 업데이트**: ${email} → ${newState} (${new Date().toISOString().split('T')[0]})\n`;
  fs.appendFileSync(ACCOUNTS_LOG_FILE, logEntry);
}

/**
 * 테스트 계정 관리자 클래스
 */
export class TestAccountManager {
  private page: Page;
  private currentAccount: CreatedAccount | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 새 계정을 생성하고 로그인합니다.
   */
  async createAndLogin(purpose: string): Promise<CreatedAccount> {
    this.currentAccount = await createNewTestAccount(this.page, purpose);
    return this.currentAccount;
  }

  /**
   * 현재 계정 정보를 반환합니다.
   */
  getCurrentAccount(): CreatedAccount | null {
    return this.currentAccount;
  }

  /**
   * 현재 계정 상태를 업데이트합니다.
   */
  updateState(newState: string): void {
    if (this.currentAccount) {
      this.currentAccount.state = newState;
      updateAccountState(this.currentAccount.email, newState);
    }
  }
}

export { DEFAULT_PASSWORD };
