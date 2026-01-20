#!/usr/bin/env tsx
/**
 * Self-Healing Test Runner CLI
 *
 * Analyzes failed tests and attempts to automatically fix them.
 *
 * Usage:
 *   npx tsx scripts/heal-tests.ts [options]
 *
 * Options:
 *   --results, -r   Path to test results JSON file
 *   --apply, -a     Automatically apply fixes
 *   --report, -R    Generate healing report
 *   --verbose, -v   Enable verbose logging
 */

import fs from 'fs/promises';
import path from 'path';
import { createSDETAgent } from '../agents/sdet/index.js';
import { SelfHealer, type TestFailure } from '../agents/sdet/self-healer.js';
import 'dotenv/config';

interface CLIOptions {
  resultsPath?: string;
  autoApply?: boolean;
  generateReport?: boolean;
  verbose?: boolean;
}

interface TestResult {
  status: 'passed' | 'failed' | 'skipped';
  name: string;
  file: string;
  line?: number;
  error?: {
    message: string;
    stack?: string;
  };
}

async function parseArgs(): Promise<CLIOptions> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Self-Healing Test Runner - Automatically fix broken E2E tests

Usage:
  npx tsx scripts/heal-tests.ts [options]

Options:
  --results, -r   Path to test results JSON file (default: reports/test-results.json)
  --apply, -a     Automatically apply fixes to test files
  --report, -R    Generate a healing report
  --verbose, -v   Enable verbose logging
  --help, -h      Show this help message

Example:
  npx tsx scripts/heal-tests.ts -r reports/test-results.json --apply --report
    `);
    process.exit(0);
  }

  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--results' || arg === '-r') {
      options.resultsPath = next;
      i++;
    } else if (arg === '--apply' || arg === '-a') {
      options.autoApply = true;
    } else if (arg === '--report' || arg === '-R') {
      options.generateReport = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

async function loadTestResults(filePath: string): Promise<TestResult[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Playwright JSON reporter format
    if (data.suites) {
      const results: TestResult[] = [];

      interface PlaywrightSpec {
        title: string;
        file?: string;
        line?: number;
        tests?: {
          results?: {
            status: string;
            error?: { message: string };
            errors?: { message: string; location?: { file: string; line: number } }[];
          }[];
        }[];
      }

      interface PlaywrightSuite {
        file?: string;
        specs?: PlaywrightSpec[];
        suites?: PlaywrightSuite[];
      }

      const extractTests = (suite: PlaywrightSuite, parentFile?: string) => {
        const currentFile = suite.file || parentFile || 'unknown';

        if (suite.specs) {
          for (const spec of suite.specs) {
            if (spec.tests) {
              for (const test of spec.tests) {
                if (test.results) {
                  for (const result of test.results) {
                    // status: passed, failed, timedOut, skipped 등
                    let status: TestResult['status'] = 'skipped';
                    if (result.status === 'passed') status = 'passed';
                    else if (result.status === 'failed' || result.status === 'timedOut') status = 'failed';

                    const errorInfo = result.errors?.[1] || result.errors?.[0] || result.error;
                    const errorLocation = result.errors?.find(e => e.location)?.location;

                    results.push({
                      status,
                      name: spec.title,
                      file: errorLocation?.file || currentFile,
                      line: errorLocation?.line || spec.line,
                      error: errorInfo ? { message: errorInfo.message } : undefined,
                    });
                  }
                }
              }
            }
          }
        }

        if (suite.suites) {
          for (const sub of suite.suites) {
            extractTests(sub, currentFile);
          }
        }
      };

      for (const suite of data.suites) {
        extractTests(suite);
      }
      return results;
    }

    // Simple array format
    if (Array.isArray(data)) {
      return data;
    }

    throw new Error('Unknown test results format');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Test results file not found: ${filePath}`);
    }
    throw error;
  }
}

function convertToFailures(results: TestResult[]): TestFailure[] {
  return results
    .filter((r) => r.status === 'failed')
    .map((r) => ({
      testFile: r.file,
      testName: r.name,
      failedLine: r.line || 1,
      errorMessage: r.error?.message || 'Unknown error',
      errorStack: r.error?.stack,
    }));
}

async function main() {
  const options = await parseArgs();
  const resultsPath = options.resultsPath || 'reports/test-results.json';

  console.log('\n🔧 Self-Healing Test Runner\n');

  // 테스트 결과 로드
  let results: TestResult[];
  try {
    console.log(`📂 Loading test results from: ${resultsPath}`);
    results = await loadTestResults(resultsPath);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  const failed = results.filter((r) => r.status === 'failed');
  const passed = results.filter((r) => r.status === 'passed');

  console.log(`\n📊 Test Summary:`);
  console.log(`   Passed: ${passed.length}`);
  console.log(`   Failed: ${failed.length}`);
  console.log(`   Total:  ${results.length}\n`);

  if (failed.length === 0) {
    console.log('✅ No failed tests to heal!');
    return;
  }

  // SDET Agent 생성
  const agent = createSDETAgent({ verbose: options.verbose });
  const healer = new SelfHealer({ autoApply: options.autoApply });

  // 실패한 테스트 분석 및 복구
  console.log('🤖 Analyzing failed tests...\n');

  const failures = convertToFailures(results);
  const healResults = await healer.healBatch(failures);

  // 결과 출력
  let healedCount = 0;
  for (const [testKey, result] of healResults) {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${testKey}`);
    console.log(`   Root Cause: ${result.analysis.rootCause.type} (${Math.round(result.analysis.rootCause.confidence * 100)}% confidence)`);
    console.log(`   ${result.analysis.rootCause.description}`);

    if (result.fix) {
      console.log(`   Fix: ${result.fix.locatorStrategy}`);
      if (result.appliedChanges) {
        console.log(`   Applied: ${result.appliedChanges}`);
      }
    }
    console.log('');

    if (result.success) healedCount++;
  }

  // 리포트 생성
  if (options.generateReport) {
    const report = healer.generateReport(healResults);
    const reportPath = 'reports/analysis/heal-report.md';

    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);

    console.log(`📝 Healing report saved to: ${reportPath}`);
  }

  console.log(`\n🏁 Healing complete: ${healedCount}/${failed.length} tests healed`);
}

main().catch(console.error);
