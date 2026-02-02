export interface TestCase {
  id: string;
  title: string;
  file: string;
  module: string;
  line: number;
  tags: string[];
  status?: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
}

export interface Feature {
  id: string;
  name: string;
  file: string;
  scenarios: Scenario[];
}

export interface Scenario {
  id: string;
  name: string;
  steps: string[];
  tags: string[];
}

export interface TestFeatureMapping {
  testFile: string;
  featureFile: string | null;
  testCount: number;
  scenarioCount: number;
  module: string;
}

export interface TestResult {
  id: string;
  testId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  timestamp: string;
}

export interface RunSummary {
  id: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  source?: 'cli' | 'dashboard';
}

export interface ModuleStats {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export type LogLevel = 'info' | 'success' | 'error' | 'warn';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}
