# AI-Driven E2E Testing System Architecture

## 목차
1. [시스템 개요](#시스템-개요)
2. [멀티 에이전트 아키텍처](#멀티-에이전트-아키텍처)
3. [에이전트 상세 설계](#에이전트-상세-설계)
4. [기술 스택](#기술-스택)
5. [디렉토리 구조](#디렉토리-구조)
6. [워크플로우](#워크플로우)
7. [통합 방안](#통합-방안)
8. [구현 로드맵](#구현-로드맵)

---

## 시스템 개요

### 비전
AI 에이전트를 활용하여 E2E 테스트의 **생성, 유지보수, 문서화**를 자동화하는 차세대 테스트 시스템

### 핵심 가치
- **Self-Healing**: UI 변경 시 자동으로 셀렉터 복구
- **Living Documentation**: 테스트 코드 기반 실시간 문서 생성
- **Intelligent Analysis**: 테스트 실패 원인 자동 분석

---

## 멀티 에이전트 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI-Driven E2E System                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │   SDET Agent     │  │   Doc Agent      │  │  Analysis Agent  │       │
│  │  (Orchestrator)  │  │  (Documenter)    │  │  (Debugger)      │       │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘       │
│           │                     │                     │                  │
│           └─────────────────────┼─────────────────────┘                  │
│                                 │                                        │
│                    ┌────────────▼────────────┐                          │
│                    │     Agent Coordinator    │                          │
│                    │    (Message Router)      │                          │
│                    └────────────┬────────────┘                          │
│                                 │                                        │
│           ┌─────────────────────┼─────────────────────┐                  │
│           │                     │                     │                  │
│  ┌────────▼─────────┐  ┌───────▼────────┐  ┌────────▼─────────┐        │
│  │  Test Runner     │  │  DOM Analyzer  │  │  Report Engine   │        │
│  │  (Playwright)    │  │  (Cheerio)     │  │  (Allure)        │        │
│  └──────────────────┘  └────────────────┘  └──────────────────┘        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 에이전트 간 통신 구조

```
┌─────────────┐     Event Bus      ┌─────────────┐
│ SDET Agent  │◄──────────────────►│  Doc Agent  │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │    ┌─────────────────────┐       │
       └───►│   Shared Context    │◄──────┘
            │   (Redis/Memory)    │
            └──────────┬──────────┘
                       │
            ┌──────────▼──────────┐
            │   Analysis Agent    │
            └─────────────────────┘
```

---

## 에이전트 상세 설계

### 1. SDET Agent (Software Development Engineer in Test)

**역할**: 테스트 아키텍처 설계 및 자동 탐색 로직 담당

#### 핵심 기능

| 기능 | 설명 | 입력 | 출력 |
|------|------|------|------|
| POM Generator | HTML 분석하여 Page Object 자동 생성 | URL/HTML | PageObject 클래스 |
| Flow Analyzer | 사용자 흐름 분석 및 테스트 케이스 생성 | 시나리오 프롬프트 | Test Spec 파일 |
| Self-Healer | 깨진 셀렉터 자동 복구 | 실패 로그 + DOM | 수정된 셀렉터 |
| Locator Suggester | 최적의 locator 전략 추천 | DOM Element | Locator 우선순위 목록 |

#### Self-Healing 프로세스

```
테스트 실패 감지
       │
       ▼
┌──────────────────┐
│ 실패 원인 분류   │
│ - Selector 변경  │
│ - Timeout        │
│ - Logic Error    │
└────────┬─────────┘
         │
         ▼ (Selector 변경인 경우)
┌──────────────────┐
│ DOM Snapshot     │
│ 비교 분석        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 대체 Selector    │
│ 후보 생성        │
│ - data-testid    │
│ - aria-label     │
│ - text content   │
│ - CSS path       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 후보 검증 및     │
│ 코드 자동 수정   │
└──────────────────┘
```

#### 프롬프트 예시

```typescript
// SDET Agent 프롬프트 구조
interface SDETAgentPrompt {
  task: 'generate_pom' | 'analyze_flow' | 'self_heal' | 'suggest_locator';
  context: {
    url?: string;
    html?: string;
    failedTest?: TestResult;
    targetElement?: string;
  };
  constraints?: {
    framework: 'playwright' | 'cypress';
    language: 'typescript' | 'javascript';
    pomStyle: 'class' | 'functional';
  };
}
```

---

### 2. Documentation Agent

**역할**: 테스트 코드 기반 살아있는 문서 생성

#### 핵심 기능

| 기능 | 설명 | 입력 | 출력 |
|------|------|------|------|
| Spec-to-Doc | 테스트 코드 → 비즈니스 명세서 | Test Spec | Gherkin/Markdown |
| Daily Digest | 일일 테스트 변경 사항 요약 | Git Diff + Results | Summary Report |
| Coverage Reporter | 커버리지 현황 시각화 | Coverage Data | HTML Report |
| API Doc Generator | E2E 테스트 기반 API 문서 | Network Logs | OpenAPI Spec |

#### 문서 생성 파이프라인

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Test Code   │────►│ AST Parser  │────►│ Doc Template│
│ (.spec.ts)  │     │             │     │ Engine      │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐            │
                    │ Business    │◄───────────┘
                    │ Requirements│
                    │ (Gherkin)   │
                    └─────────────┘
```

#### 출력 문서 형식

```gherkin
# 자동 생성 예시

Feature: 사용자 로그인
  Scenario: 유효한 자격 증명으로 로그인
    Given 사용자가 로그인 페이지에 접속
    When 이메일 "user@example.com"을 입력
    And 비밀번호 "password123"을 입력
    And 로그인 버튼을 클릭
    Then 대시보드 페이지로 이동
    And 환영 메시지가 표시됨

  # 생성 기준: login.spec.ts:15-32
  # 마지막 업데이트: 2024-01-19
  # 테스트 통과율: 100% (최근 7일)
```

---

### 3. Analysis Agent (Code Quality & Debugging)

**역할**: 테스트 품질 향상 및 실패 원인 분석

#### 핵심 기능

| 기능 | 설명 | 입력 | 출력 |
|------|------|------|------|
| Root Cause Analyzer | 테스트 실패 근본 원인 분석 | 실패 로그 + History | 원인 분석 리포트 |
| Diff Analyzer | 코드/DOM 변경 비교 분석 | Before/After Snapshots | Diff Report |
| Flaky Test Detector | 불안정 테스트 탐지 및 개선안 | Test History | 개선 제안 목록 |
| Performance Analyzer | 테스트 실행 시간 최적화 | Execution Metrics | 최적화 제안 |

#### 실패 분석 워크플로우

```
┌─────────────────────────────────────────────────────────┐
│                    실패 테스트 입력                      │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 코드 변경   │  │ DOM 변경    │  │ 환경 변수   │
│ 분석        │  │ 분석        │  │ 분석        │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
            ┌───────────────────┐
            │  원인 종합 분석   │
            │  & 우선순위 정렬  │
            └─────────┬─────────┘
                      │
                      ▼
            ┌───────────────────┐
            │  해결책 제안      │
            │  (코드 수정 포함) │
            └───────────────────┘
```

#### 분석 리포트 예시

```markdown
## 테스트 실패 분석 리포트

### 실패 테스트
- **파일**: checkout.spec.ts
- **테스트명**: "결제 완료 후 확인 페이지 표시"
- **실패 시각**: 2024-01-19 14:30:22

### 근본 원인
**확신도: 95%** - DOM 구조 변경

### 상세 분석
| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 버튼 셀렉터 | `#submit-btn` | `button[data-action="submit"]` |
| 변경 커밋 | - | abc1234 (2024-01-19) |
| 변경자 | - | @developer |

### 제안 수정 사항
```diff
- await page.click('#submit-btn');
+ await page.click('button[data-action="submit"]');
```

### 추가 권장 사항
- `data-testid` 속성 사용 권장
- 셀렉터 안정성 점수: 현재 60% → 권장 90%+
```

---

## 기술 스택

### Core Framework

| 구분 | 기술 | 선택 이유 |
|------|------|----------|
| Test Runner | **Playwright** | 크로스 브라우저, Auto-wait, Trace 지원 |
| Language | **TypeScript** | 타입 안정성, IDE 지원 |
| AI Engine | **Claude API** | 코드 생성, 분석 능력 우수 |
| Agent Framework | **LangChain** or **Custom** | 에이전트 오케스트레이션 |

### Supporting Tools

| 구분 | 기술 | 용도 |
|------|------|------|
| DOM Parser | Cheerio | HTML 분석 |
| Report | Allure | 테스트 리포트 |
| CI/CD | GitHub Actions | 자동화 파이프라인 |
| State Management | Redis / SQLite | 에이전트 상태 공유 |
| Diff Tool | diff2html | 변경 사항 시각화 |

### 프로젝트 의존성

```json
{
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "@anthropic-ai/sdk": "^0.10.0",
    "cheerio": "^1.0.0-rc.12",
    "typescript": "^5.3.0"
  },
  "devDependencies": {
    "allure-playwright": "^2.10.0",
    "diff": "^5.1.0",
    "@types/node": "^20.10.0"
  }
}
```

---

## 디렉토리 구조

```
ai_driven_e2e/
├── agents/                      # AI 에이전트 모듈
│   ├── sdet/                    # SDET Agent
│   │   ├── index.ts
│   │   ├── pom-generator.ts     # Page Object 생성기
│   │   ├── flow-analyzer.ts     # 흐름 분석기
│   │   ├── self-healer.ts       # Self-healing 로직
│   │   └── prompts/             # 프롬프트 템플릿
│   │       ├── pom.prompt.ts
│   │       ├── flow.prompt.ts
│   │       └── heal.prompt.ts
│   │
│   ├── documentation/           # Documentation Agent
│   │   ├── index.ts
│   │   ├── spec-to-doc.ts       # 테스트→문서 변환
│   │   ├── daily-digest.ts      # 일일 리포트
│   │   └── templates/           # 문서 템플릿
│   │       ├── gherkin.hbs
│   │       └── report.hbs
│   │
│   ├── analysis/                # Analysis Agent
│   │   ├── index.ts
│   │   ├── root-cause.ts        # 원인 분석
│   │   ├── diff-analyzer.ts     # 변경 분석
│   │   └── flaky-detector.ts    # 불안정 테스트 탐지
│   │
│   └── coordinator/             # 에이전트 조율기
│       ├── index.ts
│       ├── message-bus.ts       # 이벤트 버스
│       └── context-store.ts     # 공유 컨텍스트
│
├── core/                        # 핵심 유틸리티
│   ├── ai-client.ts             # Claude API 클라이언트
│   ├── dom-parser.ts            # DOM 분석 유틸
│   ├── snapshot-manager.ts      # DOM 스냅샷 관리
│   └── config.ts                # 설정 관리
│
├── tests/                       # 실제 E2E 테스트
│   ├── specs/                   # 테스트 스펙 파일
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   └── logout.spec.ts
│   │   └── checkout/
│   │       └── payment.spec.ts
│   │
│   ├── pages/                   # Page Objects (자동 생성)
│   │   ├── LoginPage.ts
│   │   ├── DashboardPage.ts
│   │   └── CheckoutPage.ts
│   │
│   ├── fixtures/                # 테스트 픽스처
│   │   ├── users.json
│   │   └── products.json
│   │
│   └── snapshots/               # DOM 스냅샷 저장소
│       └── .gitkeep
│
├── reports/                     # 생성된 리포트
│   ├── allure-results/
│   ├── docs/                    # 자동 생성 문서
│   │   ├── features/
│   │   └── daily/
│   └── analysis/                # 분석 리포트
│
├── scripts/                     # CLI 스크립트
│   ├── generate-pom.ts          # POM 생성 CLI
│   ├── heal-tests.ts            # Self-healing 실행
│   └── generate-docs.ts         # 문서 생성
│
├── config/
│   ├── playwright.config.ts
│   ├── agents.config.ts         # 에이전트 설정
│   └── prompts.config.ts        # 프롬프트 설정
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 워크플로우

### 1. 신규 페이지 테스트 추가 워크플로우

```
┌─────────────────────────────────────────────────────────────────┐
│  개발자: "로그인 페이지 테스트 추가해줘"                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  SDET Agent                                                      │
│  1. URL 접속 및 DOM 분석                                         │
│  2. Page Object 자동 생성 (LoginPage.ts)                         │
│  3. 주요 사용자 흐름 식별                                         │
│  4. 테스트 케이스 생성 (login.spec.ts)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Documentation Agent                                             │
│  1. 생성된 테스트 분석                                           │
│  2. Gherkin 형식 Feature 문서 생성                               │
│  3. README 업데이트                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  출력물                                                          │
│  - tests/pages/LoginPage.ts                                      │
│  - tests/specs/auth/login.spec.ts                               │
│  - reports/docs/features/login.feature                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 테스트 실패 자동 복구 워크플로우

```
┌─────────────────────────────────────────────────────────────────┐
│  CI Pipeline: 테스트 실패 감지                                    │
│  checkout.spec.ts - "결제 버튼 클릭" 실패                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Analysis Agent                                                  │
│  1. 실패 로그 분석                                               │
│  2. 이전 성공 시점 DOM vs 현재 DOM 비교                          │
│  3. 근본 원인 식별: "셀렉터 변경"                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  SDET Agent (Self-Healer)                                        │
│  1. 대체 셀렉터 후보 생성                                        │
│  2. 후보 셀렉터 검증 (실제 DOM에서 테스트)                        │
│  3. 최적 셀렉터 선택 및 코드 수정                                 │
│  4. 수정된 테스트 재실행                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Documentation Agent                                             │
│  1. 변경 사항 기록                                               │
│  2. Self-healing 리포트 생성                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  출력물                                                          │
│  - PR: "fix: 결제 버튼 셀렉터 자동 수정"                          │
│  - reports/analysis/heal-report-20240119.md                      │
└─────────────────────────────────────────────────────────────────┘
```

### 3. 일일 리포트 생성 워크플로우

```
┌─────────────────────────────────────────────────────────────────┐
│  Daily Cron: 매일 오전 9시                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Analysis Agent                                                  │
│  1. 지난 24시간 테스트 실행 결과 수집                            │
│  2. 실패 패턴 분석                                               │
│  3. 커버리지 변화 추적                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Documentation Agent                                             │
│  1. 일일 요약 리포트 생성                                        │
│  2. 변경된 테스트 목록 정리                                      │
│  3. 위험 신호 하이라이트                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  출력물                                                          │
│  - Slack 알림: 일일 테스트 현황                                   │
│  - reports/daily/2024-01-19.md                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 통합 방안

### CI/CD 통합 (GitHub Actions)

```yaml
# .github/workflows/e2e-ai.yml
name: AI-Driven E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # 매일 자정

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run E2E Tests
        run: npm run test:e2e
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Self-Heal on Failure
        if: failure()
        run: npm run heal:tests

      - name: Generate Documentation
        run: npm run docs:generate

      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: reports/
```

### 에이전트 호출 API

```typescript
// 통합 진입점 예시
import { AgentCoordinator } from './agents/coordinator';

const coordinator = new AgentCoordinator({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  verbose: true,
});

// 1. POM 생성
await coordinator.execute({
  agent: 'sdet',
  task: 'generate_pom',
  params: {
    url: 'https://example.com/login',
    outputPath: './tests/pages/LoginPage.ts',
  },
});

// 2. 테스트 실패 시 자동 복구
await coordinator.execute({
  agent: 'sdet',
  task: 'self_heal',
  params: {
    testFile: './tests/specs/auth/login.spec.ts',
    errorLog: failureLog,
  },
});

// 3. 문서 생성
await coordinator.execute({
  agent: 'documentation',
  task: 'generate_feature',
  params: {
    specFiles: ['./tests/specs/**/*.spec.ts'],
    outputDir: './reports/docs/features',
  },
});
```

---

## 구현 로드맵

### Phase 1: Foundation (Week 1-2)
- [ ] 프로젝트 초기 구조 설정
- [ ] Playwright 기본 설정
- [ ] Claude API 클라이언트 구현
- [ ] 기본 DOM 파서 구현

### Phase 2: SDET Agent (Week 3-4)
- [ ] POM Generator 구현
- [ ] Flow Analyzer 구현
- [ ] Locator Suggester 구현
- [ ] Self-Healer 기본 버전

### Phase 3: Documentation Agent (Week 5-6)
- [ ] Spec-to-Doc 변환기
- [ ] Daily Digest 생성기
- [ ] Gherkin 템플릿 엔진

### Phase 4: Analysis Agent (Week 7-8)
- [ ] Root Cause Analyzer
- [ ] Diff Analyzer
- [ ] Flaky Test Detector

### Phase 5: Integration (Week 9-10)
- [ ] Agent Coordinator 완성
- [ ] CI/CD 파이프라인 구축
- [ ] 모니터링 및 알림 시스템

### Phase 6: Polish & Optimize (Week 11-12)
- [ ] 성능 최적화
- [ ] 프롬프트 튜닝
- [ ] 문서화 완성
- [ ] 팀 교육 자료 작성

---

## 다음 단계

1. **즉시 시작 가능한 작업**
   - 프로젝트 초기화 (`npm init`, `package.json` 설정)
   - Playwright 설치 및 기본 설정
   - 디렉토리 구조 생성

2. **기술 검토 필요 사항**
   - Claude API 요금 및 Rate Limit 확인
   - 팀 내 TypeScript 숙련도 파악
   - 타겟 웹 애플리케이션 접근 권한 확인

3. **의사결정 필요 사항**
   - 에이전트 프레임워크 선택 (LangChain vs Custom)
   - 상태 저장소 선택 (Redis vs SQLite vs Memory)
   - 리포트 형식 및 배포 방법

---

## 부록: 프롬프트 설계 예시

### POM Generator 프롬프트

```typescript
const POM_GENERATOR_PROMPT = `
당신은 Playwright E2E 테스트를 위한 Page Object Model 전문가입니다.

주어진 HTML을 분석하여 TypeScript Page Object 클래스를 생성하세요.

## 규칙
1. 모든 상호작용 가능한 요소에 대해 locator를 정의하세요
2. Locator 우선순위: data-testid > aria-label > role > CSS selector
3. 각 locator에 JSDoc 주석을 추가하세요
4. 일반적인 사용자 액션을 메서드로 정의하세요
5. 비동기 메서드는 async/await를 사용하세요

## 입력
URL: {{url}}
HTML:
\`\`\`html
{{html}}
\`\`\`

## 출력 형식
TypeScript Page Object 클래스 (Playwright 형식)
`;
```

### Self-Healer 프롬프트

```typescript
const SELF_HEALER_PROMPT = `
당신은 E2E 테스트 자동 복구 전문가입니다.

실패한 테스트와 변경된 DOM을 분석하여 수정된 코드를 제안하세요.

## 실패 정보
- 테스트 파일: {{testFile}}
- 실패한 줄: {{failedLine}}
- 에러 메시지: {{errorMessage}}

## DOM 비교
이전 (성공 시점):
\`\`\`html
{{previousDOM}}
\`\`\`

현재 (실패 시점):
\`\`\`html
{{currentDOM}}
\`\`\`

## 분석 및 수정
1. 실패 원인을 분석하세요
2. 대체 selector 후보를 3개 이상 제시하세요
3. 가장 안정적인 selector를 선택하고 그 이유를 설명하세요
4. 수정된 코드를 제공하세요
`;
```
