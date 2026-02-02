import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface TestCase {
  id: string;
  title: string;
  file: string;
  module: string;
  line: number;
  tags: string[];
}

interface TestFeatureMapping {
  testFile: string;
  featureFile: string | null;
  testCount: number;
  scenarioCount: number;
  module: string;
}

interface ModuleStats {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export class ResultMapper {
  private projectRoot: string;
  private specsDir: string;
  private featuresDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.specsDir = path.join(projectRoot, 'tests', 'specs');
    this.featuresDir = path.join(projectRoot, 'reports', 'docs', 'features');
  }

  async getTests(): Promise<TestCase[]> {
    const tests: TestCase[] = [];

    if (!fs.existsSync(this.specsDir)) {
      return tests;
    }

    const specFiles = await glob('**/*.spec.ts', { cwd: this.specsDir });

    for (const file of specFiles) {
      const filePath = path.join(this.specsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileTests = this.parseTestFile(file, content);
      tests.push(...fileTests);
    }

    return tests;
  }

  private parseTestFile(filename: string, content: string): TestCase[] {
    const tests: TestCase[] = [];
    const lines = content.split('\n');
    const module = filename.split('/')[0] || 'unknown';
    const basename = path.basename(filename);

    let lineNumber = 0;
    let currentTags: string[] = [];

    for (const line of lines) {
      lineNumber++;

      // Look for tags in comments
      const tagMatch = line.match(/@(\w+)/g);
      if (tagMatch && line.trim().startsWith('//')) {
        currentTags = tagMatch;
      }

      // Match test() or it() calls
      const testMatch = line.match(/^\s*(?:test|it)\s*\(\s*['"`](.+?)['"`]/);
      if (testMatch) {
        const fileId = basename.replace('.spec.ts', '');
        tests.push({
          id: `${fileId}-${tests.length + 1}`,
          title: testMatch[1],
          file: basename,
          module,
          line: lineNumber,
          tags: [...currentTags],
        });
        currentTags = [];
      }

      // Also match test.describe for context
      const describeMatch = line.match(/^\s*test\.describe\s*\(\s*['"`](.+?)['"`]/);
      if (describeMatch) {
        // Reset tags for new describe block
        currentTags = [];
      }
    }

    return tests;
  }

  async getMappings(): Promise<TestFeatureMapping[]> {
    const mappings: TestFeatureMapping[] = [];

    if (!fs.existsSync(this.specsDir)) {
      return mappings;
    }

    const specFiles = await glob('**/*.spec.ts', { cwd: this.specsDir });
    const featureFiles = fs.existsSync(this.featuresDir)
      ? await glob('*.feature', { cwd: this.featuresDir })
      : [];

    // Create a map of feature files by base name
    const featureMap: Record<string, string> = {};
    for (const f of featureFiles) {
      const baseName = f.replace('.feature', '').toLowerCase();
      featureMap[baseName] = f;
    }

    for (const specFile of specFiles) {
      const filePath = path.join(this.specsDir, specFile);
      const content = fs.readFileSync(filePath, 'utf-8');
      const tests = this.parseTestFile(specFile, content);

      const basename = path.basename(specFile, '.spec.ts').toLowerCase();
      const module = specFile.split('/')[0] || 'unknown';

      // Try to find matching feature file
      let matchedFeature: string | null = null;
      let scenarioCount = 0;

      // Try exact match
      if (featureMap[basename]) {
        matchedFeature = featureMap[basename];
      } else {
        // Try prefix match (e.g., 'login' matches 'login-flow.feature')
        for (const [featureName, featureFile] of Object.entries(featureMap)) {
          if (featureName.startsWith(basename) || basename.startsWith(featureName)) {
            matchedFeature = featureFile;
            break;
          }
        }
      }

      // Count scenarios in matched feature
      if (matchedFeature) {
        const featurePath = path.join(this.featuresDir, matchedFeature);
        const featureContent = fs.readFileSync(featurePath, 'utf-8');
        const scenarioMatches = featureContent.match(/(Scenario:|시나리오:|Scenario Outline:|시나리오 개요:)/g);
        scenarioCount = scenarioMatches?.length || 0;
      }

      mappings.push({
        testFile: path.basename(specFile),
        featureFile: matchedFeature,
        testCount: tests.length,
        scenarioCount,
        module,
      });
    }

    return mappings;
  }

  async getModuleStats(): Promise<ModuleStats[]> {
    const tests = await this.getTests();
    const statsMap: Record<string, ModuleStats> = {};

    for (const test of tests) {
      if (!statsMap[test.module]) {
        statsMap[test.module] = {
          name: test.module,
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
        };
      }
      statsMap[test.module].total++;
    }

    // Try to get actual results from test-results.json
    const resultsPath = path.join(this.projectRoot, 'reports', 'test-results.json');
    if (fs.existsSync(resultsPath)) {
      try {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
        // Process results and update stats
        // This depends on the actual format of test-results.json
      } catch (e) {
        // Ignore parse errors
      }
    }

    return Object.values(statsMap).sort((a, b) => b.total - a.total);
  }
}
