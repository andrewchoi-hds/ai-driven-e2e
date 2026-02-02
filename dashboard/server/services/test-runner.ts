import { spawn, ChildProcess } from 'child_process';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import fs from 'fs';

interface TestToRun {
  file: string;
  title: string;
}

interface TestResult {
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
  results: TestResult[];
}

export class TestRunner {
  private io: SocketServer;
  private projectRoot: string;
  private runningProcess: ChildProcess | null = null;
  private historyPath: string;

  constructor(io: SocketServer, projectRoot: string) {
    this.io = io;
    this.projectRoot = projectRoot;
    this.historyPath = path.join(projectRoot, 'reports', 'run-history.json');

    // Ensure reports directory exists
    const reportsDir = path.dirname(this.historyPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  }

  async runTests(tests: TestToRun[]): Promise<void> {
    if (this.runningProcess) {
      throw new Error('A test run is already in progress');
    }

    const startTime = Date.now();
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // Emit run start event
    this.io.emit('run:start', { total: tests.length });

    try {
      // Build the grep pattern for Playwright
      const grepPattern = tests.map((t) => t.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

      // Build the file filter
      const uniqueFiles = [...new Set(tests.map((t) => t.file))];
      const fileArgs = uniqueFiles.map((f) => `tests/specs/**/${f}`);

      // Construct Playwright command
      const args = [
        'playwright',
        'test',
        ...fileArgs,
        '--grep',
        grepPattern,
        '--reporter=json',
      ];

      this.io.emit('log', { message: `Running: npx ${args.join(' ')}`, level: 'info' });

      // Spawn the Playwright process
      this.runningProcess = spawn('npx', args, {
        cwd: this.projectRoot,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      let jsonOutput = '';
      let errorOutput = '';

      this.runningProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        jsonOutput += text;
      });

      this.runningProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        errorOutput += text;

        // Parse progress info from stderr
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            // Check for test result patterns
            if (line.includes('✓') || line.includes('passed')) {
              const testMatch = line.match(/✓.*?(\d+)\s+(.+)/);
              if (testMatch) {
                this.io.emit('test:pass', { test: testMatch[2], duration: 0 });
                passed++;
              }
            } else if (line.includes('✘') || line.includes('failed')) {
              const testMatch = line.match(/✘.*?(\d+)\s+(.+)/);
              if (testMatch) {
                this.io.emit('test:fail', { test: testMatch[2], error: 'See logs' });
                failed++;
              }
            } else if (line.includes('skipped')) {
              skipped++;
            }

            this.io.emit('log', { message: line, level: 'info' });
          }
        }
      });

      // Wait for process to complete
      await new Promise<void>((resolve, reject) => {
        this.runningProcess!.on('close', (code) => {
          this.runningProcess = null;

          // Try to parse JSON output
          try {
            const jsonStart = jsonOutput.indexOf('{');
            if (jsonStart !== -1) {
              const jsonData = JSON.parse(jsonOutput.slice(jsonStart));

              // Extract results from Playwright JSON reporter
              if (jsonData.suites) {
                for (const suite of jsonData.suites) {
                  this.processResults(suite, results);
                }
              }

              passed = results.filter((r) => r.status === 'passed').length;
              failed = results.filter((r) => r.status === 'failed').length;
              skipped = results.filter((r) => r.status === 'skipped').length;
            }
          } catch (e) {
            // JSON parsing failed, use stderr results
            this.io.emit('log', { message: 'Could not parse JSON results', level: 'warn' });
          }

          resolve();
        });

        this.runningProcess!.on('error', (err) => {
          this.runningProcess = null;
          reject(err);
        });
      });
    } catch (error) {
      this.io.emit('log', {
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        level: 'error',
      });
    }

    const duration = Date.now() - startTime;

    // Save to history
    const summary: RunSummary = {
      id: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      total: tests.length,
      passed,
      failed,
      skipped,
      duration,
      results,
    };

    await this.saveToHistory(summary);

    // Emit run end event
    this.io.emit('run:end', {
      passed,
      failed,
      skipped,
      duration,
    });
  }

  private processResults(suite: any, results: TestResult[]): void {
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests || []) {
          const result = test.results?.[0];
          if (result) {
            results.push({
              id: `result-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              testId: spec.title,
              status: result.status === 'expected' ? 'passed' : result.status,
              duration: result.duration || 0,
              error: result.error?.message,
              timestamp: new Date().toISOString(),
            });

            // Emit individual test result
            if (result.status === 'expected' || result.status === 'passed') {
              this.io.emit('test:pass', { test: spec.title, duration: result.duration });
            } else if (result.status === 'failed' || result.status === 'unexpected') {
              this.io.emit('test:fail', { test: spec.title, error: result.error?.message || 'Failed' });
            } else if (result.status === 'skipped') {
              this.io.emit('test:skip', { test: spec.title });
            }
          }
        }
      }
    }

    // Recursively process child suites
    if (suite.suites) {
      for (const childSuite of suite.suites) {
        this.processResults(childSuite, results);
      }
    }
  }

  private async saveToHistory(summary: RunSummary): Promise<void> {
    let history: RunSummary[] = [];

    try {
      if (fs.existsSync(this.historyPath)) {
        const content = fs.readFileSync(this.historyPath, 'utf-8');
        history = JSON.parse(content);
      }
    } catch (e) {
      history = [];
    }

    // Add new summary at the beginning
    history.unshift(summary);

    // Keep only last 50 runs
    history = history.slice(0, 50);

    fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
  }

  getHistory(): RunSummary[] {
    try {
      if (fs.existsSync(this.historyPath)) {
        const content = fs.readFileSync(this.historyPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  getLatestRun(): RunSummary | null {
    const history = this.getHistory();
    return history[0] || null;
  }

  clearHistory(): void {
    if (fs.existsSync(this.historyPath)) {
      fs.unlinkSync(this.historyPath);
    }
  }

  isRunning(): boolean {
    return this.runningProcess !== null;
  }

  stop(): void {
    if (this.runningProcess) {
      this.runningProcess.kill('SIGTERM');
      this.runningProcess = null;
    }
  }
}
