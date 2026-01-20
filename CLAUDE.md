# CLAUDE.md - AI 어시스턴트 컨텍스트

이 문서는 AI 어시스턴트(Claude)가 이 프로젝트에서 작업할 때 필요한 핵심 정보를 담고 있습니다.

---

## 프로젝트 개요

| 항목 | 값 |
|------|-----|
| **프로젝트명** | AI-Driven E2E Testing System |
| **프레임워크** | Playwright + TypeScript |
| **대상 앱** | HireVisa (한국 비자/이민 서비스 모바일 앱) |
| **Base URL** | `http://qa.hirevisa.com` |
| **언어 지원** | 영어/한국어 이중 언어 인터페이스 |

---

## 테스트 사용자 관리

### 테스트 사용자 Fixture

**위치**: `tests/fixtures/test-users.ts`

사용자는 온보딩 플로우 진행 상태에 따라 구분됩니다:

```typescript
export type UserState =
  | 'new'                  // 신규 가입 (여권 미등록)
  | 'passport_registered'  // 여권 등록 완료
  | 'arc_pending'          // 외국인등록증 심사 중
  | 'arc_verified'         // 외국인등록증 인증 완료
  | 'plan_subscribed'      // 요금제 가입 완료
  | 'inactive';            // 비활성 계정
```

**주요 테스트 계정**:
- `testUsers.newUser` - 기본 테스트 사용자
- `testUsers.aiqa1` ~ `testUsers.aiqa6` - AI QA 테스트 계정

**사용 패턴**:
```typescript
import { testUsers } from '../fixtures/test-users';
await loginPage.login(testUsers.newUser.email, testUsers.newUser.password);
```

---

## Page Object Models (POM)

### 회원가입 플로우 POM

**파일**: `tests/pages/SignupPage.ts`

**다단계 플로우**:
1. **이메일 입력** → next 버튼
2. **인증 코드** (QA 환경: `000000`) → Verification completed
3. **비밀번호 설정** → next 버튼
4. **약관 동의** → Next 버튼
5. **가입 완료** → Confirmation 버튼 → /home 또는 /login 이동

**주요 메서드**:
```typescript
// 전체 회원가입 헬퍼
await signupPage.completeSignup(email, password, verificationCode);

// 현재 단계 확인
const step = await signupPage.getCurrentStep();

// 이메일 중복 확인
const isDuplicate = await signupPage.isEmailDuplicate();
```

**중요 Locator**:
- 이메일: `#email`
- 인증 코드: `#verification-code`
- 비밀번호: `#password`, `#passwordConfirm`
- 전체 동의: `getByText('Agree to all terms and conditions')`

### 이중 언어 지원

버튼은 영어와 한국어 텍스트를 모두 지원합니다:
```typescript
// 패턴: /(영어|한국어)/i
this.confirmationButton = page.getByRole('button', { name: /Confirmation|확인/i });
```

### 기타 POM

`tests/pages/` 디렉토리:
- `LoginPage.ts` - 로그인
- `HomePage.ts` - 메인 대시보드 (상태별 UI)
- `MyPage.ts` - 사용자 프로필
- `PassportPage.ts` - 여권 등록
- `MobilePlanPage.ts` - 요금제
- `LifePage.ts`, `BenefitPage.ts` - 콘텐츠 페이지

---

## 테스트 패턴 및 규칙

### 테스트 구조

```
tests/specs/
├── auth/           # 인증 플로우 (login, signup)
├── home/           # 홈 페이지 (상태별 테스트 포함)
├── mypage/         # 마이페이지
├── navigation/     # 하단 네비게이션
└── [feature]/      # 기능별 테스트
```

### 회원가입 테스트 패턴 (12개 테스트)

**파일**: `tests/specs/auth/signup.spec.ts`

플로우 단계별 구성:
- **Step 1**: 이메일 입력 (3개) - 폼 표시, 유효성 검사, 중복 감지
- **Step 2**: 인증 코드 (2개) - 코드 입력, 유효 코드 진행
- **Step 3**: 비밀번호 설정 (2개) - 필드 표시, 비밀번호 일치
- **Step 4**: 약관 동의 (2개) - 체크박스 표시, 제출 활성화
- **Full Flow** (2개) - 전체 가입, POM 헬퍼 사용
- **Navigation** (1개) - 뒤로가기

**고유 이메일 패턴**:
```typescript
const uniqueEmail = `test-${Date.now()}@aaa.com`;
```

### 상태별 테스트

사용자 상태에 따른 UI 변화 검증:
```typescript
test('should show passport registration for new user', async () => {
  await loginPage.login(testUsers.newUser.email, testUsers.newUser.password);
  await expect(homePage.passportRegistrationCard).toBeVisible();
});
```

---

## 스크립트 및 자동화

### 문서 생성

**스크립트**: `scripts/generate-docs.ts`

**용도**: Playwright 테스트 스펙을 한국어 Gherkin 기능 파일로 변환

```bash
npx tsx scripts/generate-docs.ts -s tests/specs -o reports/docs/features
```

**출력**: `reports/docs/features/*.feature`

### 한국어 테스트 리포트

**스크립트**: `scripts/generate-korean-report.ts`

```bash
npx tsx scripts/generate-korean-report.ts
```

**출력**: `reports/test-report-ko.md`

### 테스트 계정 생성

**스크립트**: `scripts/create-test-accounts.ts`

```bash
npx tsx scripts/create-test-accounts.ts
```

- aiqa1@aaa.com ~ aiqa6@aaa.com 형태로 생성
- 비밀번호: `qwer1234`, 인증 코드: `000000`

---

## NPM 스크립트

```bash
npm test              # 테스트 실행
npm run test:ui       # UI 모드
npm run test:debug    # 디버거
npm run test:report   # HTML 리포트

npm run agent:pom     # POM 생성
npm run agent:heal    # Self-healing
npm run agent:docs    # Gherkin 문서 생성
npm run agent:analyze # 실패 분석
```

---

## 환경 설정

### 필수 환경 변수

`.env` 파일 (git에 커밋하지 않음):
```bash
BASE_URL=http://qa.hirevisa.com
ANTHROPIC_API_KEY=your_api_key_here
```

### QA 환경 특이사항

- **인증 코드**: QA 환경에서 항상 `000000`
- **뷰포트**: 모바일 뷰포트 (390x844)
- **언어**: 영어/한국어 모두 지원

---

## 핵심 기술 사항

### 이중 언어 테스트 전략

```typescript
// 단일 용어
{ name: /Submit|제출/i }

// 다중 용어
{ name: /(Sign up|회원가입|Register|등록)/i }
```

### 다단계 플로우 처리

```typescript
await signupPage.enterEmail(email);
await signupPage.verificationCodeInput.waitFor({ state: 'visible', timeout: 15000 });
await signupPage.enterVerificationCode('000000');
// ... 다음 단계
```

**핵심**: 다음 단계 요소가 표시될 때까지 항상 대기

### Force Click 패턴

일부 버튼은 시각적으로 활성화되어 있지만 DOM에서 disabled 상태일 수 있습니다:
```typescript
await signupPage.emailNextButton.click({ force: true });
```

---

## 문서화 산출물

### Gherkin 기능 파일

**위치**: `reports/docs/features/`

**생성된 파일**:
- signup.feature (12개 시나리오)
- login.feature
- home.feature, home-state.feature
- mypage.feature, navigation.feature
- life.feature, benefit.feature

### 테스트 리포트

- **한국어 리포트**: `reports/test-report-ko.md`
- **HTML 리포트**: `playwright-report/index.html`
- **JSON 결과**: `reports/test-results.json`

---

## 일반적인 워크플로우

### 새 테스트 스위트 추가

1. 스펙 파일 생성: `tests/specs/[feature]/[name].spec.ts`
2. POM 임포트: `import { SignupPage } from '../../pages/SignupPage'`
3. Fixture 사용: `import { testUsers } from '../../fixtures/test-users'`
4. 테스트 실행: `npm test -- tests/specs/[feature]/[name].spec.ts`
5. 문서 생성: `npm run agent:docs -- -s tests/specs/[feature]`

### 실패 테스트 디버깅

1. UI 모드 실행: `npm run test:ui`
2. `test-results/` 폴더에서 스크린샷 확인
3. Playwright UI에서 trace 파일 검토
4. 언어별 텍스트 이슈 확인 (영어 vs 한국어)

---

## 알려진 이슈 및 해결방법

### 임시 서버 에러

QA 서버가 간헐적으로 "temporary error" 반환:
```typescript
if (await tempError.count() > 0) {
  await page.reload();
  await page.waitForTimeout(2000);
  // 데이터 재입력
}
```

### 버튼 상태 감지

일부 버튼은 `aria-disabled`가 있지만 실제로 클릭 가능:
```typescript
await button.click({ force: true });
```

### 이메일 중복

이전 테스트 실행에서 이미 존재하는 이메일:
```typescript
const uniqueEmail = `test-${Date.now()}@aaa.com`;
```

---

## 프로젝트 아키텍처

자세한 아키텍처 문서는 `ARCHITECTURE.md` 참조:
- 멀티 에이전트 시스템 설계
- Self-healing 테스트 아키텍처
- AI 통합 패턴
- CI/CD 워크플로우

---

*마지막 업데이트: 2026-01-19*
*세션: 회원가입 E2E 테스트 및 한국어 리포팅 구현*
