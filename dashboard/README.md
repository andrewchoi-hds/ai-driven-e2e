# Test Case Management Dashboard

테스트 케이스와 Gherkin Feature를 시각적으로 연결하고, UI에서 테스트 실행 및 결과를 확인할 수 있는 웹 대시보드

## 기능

- **Dashboard**: 테스트 실행 결과 요약 및 통계 차트
- **Test Explorer**: 184개 테스트 케이스 탐색 및 실행
- **Feature Map**: 10개 Gherkin Feature 파일 및 테스트 매핑 시각화
- **Run History**: 테스트 실행 히스토리 및 트렌드 분석

## 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + Socket.io
- **Styling**: Tailwind CSS
- **Charts**: Recharts

## 실행 방법

### 1. 의존성 설치

```bash
cd dashboard
npm install
```

### 2. 대시보드 시작

```bash
npm run dev
# 또는 프로젝트 루트에서
npm run dashboard
```

### 3. 브라우저에서 접속

```
http://localhost:3010
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (클라이언트 + API) 동시 실행 |
| `npm run client` | Vite 클라이언트만 실행 |
| `npm run server` | Express API 서버만 실행 |
| `npm run build` | 프로덕션 빌드 |

## API 엔드포인트

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/tests` | GET | 모든 테스트 케이스 목록 |
| `/api/tests/run` | POST | 선택된 테스트 실행 |
| `/api/features` | GET | Gherkin Feature 파일 목록 |
| `/api/mappings` | GET | 테스트-Feature 매핑 |
| `/api/results/latest` | GET | 최근 실행 결과 |
| `/api/results/history` | GET | 실행 히스토리 |
| `/api/results/stats` | GET | 모듈별 통계 |

## 포트 설정

- **3010**: Vite 개발 서버 (프론트엔드)
- **3011**: Express API 서버 (백엔드)

## 실시간 로그

Socket.io를 통해 테스트 실행 중 실시간 로그를 스트리밍합니다.

```
test:start  - 테스트 시작
test:pass   - 테스트 통과
test:fail   - 테스트 실패
test:skip   - 테스트 스킵
run:end     - 실행 완료
```

## 스크린샷

대시보드는 다음 화면을 제공합니다:

1. **Dashboard**: 요약 카드, 결과 분포 파이차트, 모듈별 통계 바차트
2. **Test Explorer**: 테스트 목록 (모듈별 그룹핑), 필터, 선택 및 실행, 실시간 로그
3. **Feature Map**: Gherkin 시나리오 목록, 테스트-Feature 매핑 테이블
4. **Run History**: 실행 기록, 통과율 트렌드 차트, 상세 결과
