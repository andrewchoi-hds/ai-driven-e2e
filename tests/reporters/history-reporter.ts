import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestResultRecord {
  id: string;
  testId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  timestamp: string;
}

interface RunSummary {
  id: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResultRecord[];
  source: 'cli' | 'dashboard';
}

/**
 * Playwright 커스텀 리포터
 *
 * CLI에서 실행한 테스트도 대시보드의 run-history.json에 기록합니다.
 */
class HistoryReporter implements Reporter {
  private historyPath: string;
  private results: TestResultRecord[] = [];
  private startTime: number = 0;
  private passed = 0;
  private failed = 0;
  private skipped = 0;

  constructor() {
    // 프로젝트 루트에서 reports 폴더 경로 설정
    this.historyPath = path.join(process.cwd(), 'reports', 'run-history.json');
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    this.results = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const status =
      result.status === 'passed'
        ? 'passed'
        : result.status === 'skipped' || result.status === 'timedOut'
          ? 'skipped'
          : 'failed';

    if (status === 'passed') this.passed++;
    else if (status === 'failed') this.failed++;
    else this.skipped++;

    this.results.push({
      id: `result-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      testId: test.title,
      status,
      duration: result.duration,
      error: result.error?.message,
      timestamp: new Date().toISOString(),
    });
  }

  onEnd(result: FullResult) {
    const duration = Date.now() - this.startTime;

    const summary: RunSummary = {
      id: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      total: this.passed + this.failed + this.skipped,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      duration,
      results: this.results,
      source: 'cli',
    };

    this.saveToHistory(summary);
  }

  private saveToHistory(summary: RunSummary): void {
    let history: RunSummary[] = [];

    // 기존 히스토리 로드
    try {
      if (fs.existsSync(this.historyPath)) {
        const content = fs.readFileSync(this.historyPath, 'utf-8');
        history = JSON.parse(content);
      }
    } catch (e) {
      history = [];
    }

    // 새 기록 추가 (최신 순)
    history.unshift(summary);

    // 최근 100개만 유지
    history = history.slice(0, 100);

    // reports 폴더가 없으면 생성
    const reportsDir = path.dirname(this.historyPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // 저장
    fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));

    console.log(`\n📊 테스트 기록 저장됨: ${this.historyPath}`);
    console.log(`   총 ${summary.total}개 | 통과 ${summary.passed} | 실패 ${summary.failed} | 스킵 ${summary.skipped}`);
  }
}

export default HistoryReporter;
