# /wrap - 세션 마무리

## 트리거
- 한국어: 세션 정리, 마무리해줘, 오늘 끝, 랩업
- 영어: wrap up, end session, done for today

## 언어 감지
| 트리거 | 태그 |
|--------|------|
| 한국어 | `[LANG: ko]` |
| 영어 | `[LANG: en]` |
| 혼합 | `[LANG: ko]` |

## 실행 흐름

### Phase 1: 병렬 분석
4개 에이전트 동시 실행 (Task 도구):
1. `session-wrap:doc-updater` - CLAUDE.md 업데이트 제안
2. `session-wrap:automation-scout` - 자동화 기회 탐지
3. `session-wrap:learning-extractor` - TIL 추출
4. `session-wrap:followup-suggester` - 다음 할 일 제안

프롬프트에 `[LANG: {감지된 언어}]` 추가

### Phase 2: 중복 검증
`session-wrap:duplicate-checker`로 Phase 1 결과 검증

### Phase 3: 사용자 선택

#### 3.1 결과 요약
```
# 세션 마무리

| 카테고리 | 발견 | 승인 |
|----------|------|------|
| 문서 | N | M |
| 자동화 | N | M |
| 배운 것 | N | M |
| 다음 할 일 | N | M |
```

#### 3.2 선택 (AskUserQuestion, multiSelect: true)
1. 커밋 생성
2. CLAUDE.md 업데이트
3. 자동화 생성
4. TIL.md 저장
5. TODO.md 저장

#### 3.3 실행
| 선택 | 동작 |
|------|------|
| 커밋 | git add → git commit |
| 문서 | CLAUDE.md에 제안 추가 |
| 자동화 | .claude/에 파일 생성 |
| TIL | TIL.md에 날짜별 추가 |
| TODO | TODO.md에 우선순위별 추가 |

#### 3.4 완료
```
## 완료
- [x] 커밋 (abc1234)
- [x] CLAUDE.md (N개)
- [ ] 자동화 (건너뜀)
- [x] TIL.md (N개)
- [ ] TODO.md (건너뜀)
```

## 주의
- Phase 1: 병렬 (효율)
- Phase 2: 순차 (의존)
- 사용자 선택 존중
