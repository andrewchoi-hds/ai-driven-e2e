# AI-Driven E2E Testing System

AI 에이전트를 활용한 차세대 E2E 테스트 자동화 시스템입니다.

## 주요 기능

- **🤖 Self-Healing**: UI 변경 시 자동으로 셀렉터 복구
- **📝 Living Documentation**: 테스트 코드 기반 실시간 문서 생성
- **🔍 Intelligent Analysis**: 테스트 실패 원인 자동 분석

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Coordinator                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ SDET Agent   │  │ Doc Agent    │  │ Analysis     │  │
│  │              │  │              │  │ Agent        │  │
│  │ • POM 생성    │  │ • Spec→Doc   │  │ • 실패 분석   │  │
│  │ • Self-Heal  │  │ • Daily      │  │ • Diff 분석   │  │
│  │ • Flow 분석   │  │   Digest    │  │ • Flaky 탐지  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 시작하기

### 1. 설치

```bash
npm install
npx playwright install
```

### 2. 환경 설정

```bash
cp .env.example .env
# .env 파일에 ANTHROPIC_API_KEY 설정
```

### 3. 테스트 실행

```bash
# 기본 테스트 실행
npm test

# UI 모드로 실행
npm run test:ui

# 디버그 모드
npm run test:debug
```

## Agent 사용법

### POM 생성

URL에서 Page Object Model을 자동 생성합니다.

```bash
npx tsx scripts/generate-pom.ts https://example.com/login -o tests/pages/LoginPage.ts
```

### Self-Healing

실패한 테스트를 분석하고 자동으로 수정합니다.

```bash
# 테스트 실행 후 실패 분석
npm test
npx tsx scripts/heal-tests.ts --apply --report
```

### 프로그래밍 방식 사용

```typescript
import { createSDETAgent, createDocumentationAgent, createAnalysisAgent } from './agents';

// SDET Agent 사용
const sdet = createSDETAgent({ verbose: true });

// POM 생성
const pom = await sdet.generatePOM({
  html: pageHtml,
  url: 'https://example.com/login',
});

// 테스트 실패 복구
const healResult = await sdet.healTest({
  testFile: 'tests/login.spec.ts',
  testName: 'should login successfully',
  failedLine: 15,
  errorMessage: 'Element not found: #submit-btn',
});

// Documentation Agent 사용
const docAgent = createDocumentationAgent();
const features = await docAgent.specToDoc(testSpecs);

// Analysis Agent 사용
const analysis = createAnalysisAgent();
const report = await analysis.detectFlakyTests(testRuns);
```

## 프로젝트 구조

```
ai_driven_e2e/
├── agents/                 # AI 에이전트 모듈
│   ├── sdet/              # SDET Agent (POM, Self-Heal, Flow)
│   ├── documentation/     # Documentation Agent
│   ├── analysis/          # Analysis Agent
│   └── coordinator/       # Agent 조율기
├── core/                  # 핵심 유틸리티
│   ├── ai-client.ts       # Claude API 클라이언트
│   ├── dom-parser.ts      # DOM 분석
│   └── snapshot-manager.ts # 스냅샷 관리
├── tests/                 # E2E 테스트
│   ├── specs/             # 테스트 스펙 (17개 파일)
│   │   ├── auth/          # 로그인/회원가입
│   │   ├── passport/      # 여권 등록
│   │   ├── school/        # 학교 선택
│   │   ├── plan/          # USIM/eSIM 요금제
│   │   ├── airport/       # 공항 서비스
│   │   ├── home/          # 홈 페이지
│   │   ├── mypage/        # 마이페이지
│   │   └── ...            # 기타 모듈
│   ├── pages/             # Page Objects
│   └── fixtures/          # 테스트 데이터/계정 관리
│       ├── test-users.ts          # 정적 테스트 계정
│       ├── test-account-manager.ts # 동적 계정 생성
│       └── files/                  # 테스트 파일 (여권 이미지 등)
├── scripts/               # CLI 스크립트
├── config/                # 설정 파일
└── reports/               # 생성된 리포트
    ├── test-accounts.md   # 생성된 테스트 계정 목록
    └── *.png              # 테스트 스크린샷
```

## 설정

### agents.config.ts

에이전트별 상세 설정을 관리합니다.

```typescript
{
  sdet: {
    model: 'claude-sonnet-4-20250514',
    selfHealing: {
      enabled: true,
      maxRetries: 3,
      autoCommit: false,
    },
    locatorStrategy: {
      priority: ['data-testid', 'aria-label', 'role', 'text', 'css'],
    },
  },
  documentation: {
    outputFormats: ['gherkin', 'markdown'],
    dailyDigest: {
      enabled: true,
      schedule: '0 9 * * *',
    },
  },
  analysis: {
    flakyThreshold: 0.1,
    snapshotRetention: 30,
  },
}
```

## API 레퍼런스

### SDET Agent

| 메서드 | 설명 |
|--------|------|
| `generatePOM(params)` | HTML에서 Page Object 생성 |
| `healTest(failure)` | 실패한 테스트 자동 복구 |
| `healSelector(params)` | 깨진 셀렉터 복구 |
| `analyzeFlow(params)` | 사용자 흐름 분석 |
| `generateTests(params)` | 테스트 코드 생성 |

### Documentation Agent

| 메서드 | 설명 |
|--------|------|
| `specToDoc(specs)` | 테스트 → Gherkin 변환 |
| `generateDailyDigest(params)` | 일일 리포트 생성 |

### Analysis Agent

| 메서드 | 설명 |
|--------|------|
| `analyzeFailure(params)` | 실패 원인 분석 |
| `compareRuns(before, after)` | 실행 결과 비교 |
| `detectFlakyTests(runs)` | 불안정 테스트 탐지 |

## 라이선스

MIT
