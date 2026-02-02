import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface Scenario {
  id: string;
  name: string;
  steps: string[];
  tags: string[];
}

interface Feature {
  id: string;
  name: string;
  file: string;
  scenarios: Scenario[];
}

export class FeatureParser {
  private projectRoot: string;
  private featuresDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.featuresDir = path.join(projectRoot, 'reports', 'docs', 'features');
  }

  async getFeatures(): Promise<Feature[]> {
    const features: Feature[] = [];

    if (!fs.existsSync(this.featuresDir)) {
      return features;
    }

    const featureFiles = await glob('*.feature', { cwd: this.featuresDir });

    for (const file of featureFiles) {
      const feature = await this.parseFeatureFile(file);
      if (feature) {
        features.push(feature);
      }
    }

    return features;
  }

  private async parseFeatureFile(filename: string): Promise<Feature | null> {
    const filePath = path.join(this.featuresDir, filename);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.parseGherkin(filename, content);
    } catch (error) {
      console.error(`Error parsing ${filename}:`, error);
      return null;
    }
  }

  private parseGherkin(filename: string, content: string): Feature {
    const lines = content.split('\n');
    const scenarios: Scenario[] = [];

    let featureName = filename.replace('.feature', '');
    let currentScenario: Scenario | null = null;
    let currentTags: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Parse feature name
      if (trimmed.startsWith('Feature:') || trimmed.startsWith('기능:')) {
        featureName = trimmed.replace(/^(Feature:|기능:)\s*/, '').trim();
      }

      // Parse tags
      if (trimmed.startsWith('@')) {
        currentTags = trimmed.split(/\s+/).filter((t) => t.startsWith('@'));
      }

      // Parse scenario
      if (
        trimmed.startsWith('Scenario:') ||
        trimmed.startsWith('시나리오:') ||
        trimmed.startsWith('Scenario Outline:') ||
        trimmed.startsWith('시나리오 개요:')
      ) {
        if (currentScenario) {
          scenarios.push(currentScenario);
        }

        const name = trimmed
          .replace(/^(Scenario:|시나리오:|Scenario Outline:|시나리오 개요:)\s*/, '')
          .trim();

        currentScenario = {
          id: `scenario-${scenarios.length + 1}`,
          name,
          steps: [],
          tags: [...currentTags],
        };
        currentTags = [];
      }

      // Parse steps
      if (
        currentScenario &&
        (trimmed.startsWith('Given') ||
          trimmed.startsWith('When') ||
          trimmed.startsWith('Then') ||
          trimmed.startsWith('And') ||
          trimmed.startsWith('But') ||
          trimmed.startsWith('만약') ||
          trimmed.startsWith('주어진') ||
          trimmed.startsWith('그러면') ||
          trimmed.startsWith('그리고'))
      ) {
        currentScenario.steps.push(trimmed);
      }
    }

    // Add last scenario
    if (currentScenario) {
      scenarios.push(currentScenario);
    }

    return {
      id: `feature-${filename.replace('.feature', '')}`,
      name: featureName,
      file: filename,
      scenarios,
    };
  }

  getScenarioCount(): number {
    let count = 0;
    const features = this.getFeatures();
    return count;
  }
}
