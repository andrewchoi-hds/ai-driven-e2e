import { getAIClient } from '../../core/ai-client.js';
import { getConfig } from '../../core/config.js';
import { getSnapshotManager } from '../../core/snapshot-manager.js';
import { type AgentHandler } from '../coordinator/index.js';
import { POMGenerator, type GeneratedPOM } from './pom-generator.js';
import { SelfHealer, type HealResult, type TestFailure } from './self-healer.js';
import { FlowAnalyzer, type FlowAnalysisResult, type GeneratedTest } from './flow-analyzer.js';

export interface SDETAgentConfig {
  verbose?: boolean;
}

export type SDETTask =
  | 'generate_pom'
  | 'heal_test'
  | 'heal_selector'
  | 'analyze_flow'
  | 'generate_tests'
  | 'suggest_locator';

export interface SDETTaskParams {
  generate_pom: {
    html: string;
    url: string;
    className?: string;
  };
  heal_test: TestFailure;
  heal_selector: {
    originalSelector: string;
    currentDom: string;
    elementDescription?: string;
    context?: string;
  };
  analyze_flow: {
    url: string;
    html: string;
    requirement: string;
    existingTests?: string[];
  };
  generate_tests: {
    analysis: FlowAnalysisResult;
    pageObjectCode: string;
    pageClassName: string;
  };
  suggest_locator: {
    elementHtml: string;
    contextHtml: string;
    purpose?: string;
  };
}

export interface SDETTaskResults {
  generate_pom: GeneratedPOM;
  heal_test: HealResult;
  heal_selector: Awaited<ReturnType<SelfHealer['healSelector']>>;
  analyze_flow: FlowAnalysisResult;
  generate_tests: GeneratedTest[];
  suggest_locator: Awaited<ReturnType<POMGenerator['suggestLocator']>>;
}

export class SDETAgent {
  private pomGenerator: POMGenerator;
  private selfHealer: SelfHealer;
  private flowAnalyzer: FlowAnalyzer;
  private verbose: boolean;

  constructor(config: SDETAgentConfig = {}) {
    const appConfig = getConfig();
    const aiClient = getAIClient();
    const snapshotManager = getSnapshotManager();

    this.pomGenerator = new POMGenerator({
      aiClient,
      locatorPriority: appConfig.agents.sdet.locatorStrategy.priority,
    });

    this.selfHealer = new SelfHealer({
      aiClient,
      snapshotManager,
      maxRetries: appConfig.agents.sdet.selfHealing.maxRetries,
      autoApply: appConfig.agents.sdet.selfHealing.autoCommit,
    });

    this.flowAnalyzer = new FlowAnalyzer({
      aiClient,
    });

    this.verbose = config.verbose ?? false;
  }

  /**
   * 태스크 실행
   */
  async execute<T extends SDETTask>(
    task: T,
    params: SDETTaskParams[T]
  ): Promise<SDETTaskResults[T]> {
    this.log(`Executing task: ${task}`);

    switch (task) {
      case 'generate_pom':
        return this.pomGenerator.generate(params as SDETTaskParams['generate_pom']) as Promise<SDETTaskResults[T]>;

      case 'heal_test':
        return this.selfHealer.heal(params as SDETTaskParams['heal_test']) as Promise<SDETTaskResults[T]>;

      case 'heal_selector':
        return this.selfHealer.healSelector(params as SDETTaskParams['heal_selector']) as Promise<SDETTaskResults[T]>;

      case 'analyze_flow':
        return this.flowAnalyzer.analyzeFlow(params as SDETTaskParams['analyze_flow']) as Promise<SDETTaskResults[T]>;

      case 'generate_tests':
        return this.flowAnalyzer.generateTests(params as SDETTaskParams['generate_tests']) as Promise<SDETTaskResults[T]>;

      case 'suggest_locator':
        return this.pomGenerator.suggestLocator(params as SDETTaskParams['suggest_locator']) as Promise<SDETTaskResults[T]>;

      default:
        throw new Error(`Unknown task: ${task}`);
    }
  }

  /**
   * Page Object Model 생성
   */
  async generatePOM(params: SDETTaskParams['generate_pom']): Promise<GeneratedPOM> {
    return this.execute('generate_pom', params);
  }

  /**
   * 테스트 실패 복구
   */
  async healTest(failure: TestFailure): Promise<HealResult> {
    return this.execute('heal_test', failure);
  }

  /**
   * 셀렉터 복구
   */
  async healSelector(params: SDETTaskParams['heal_selector']) {
    return this.execute('heal_selector', params);
  }

  /**
   * 사용자 흐름 분석
   */
  async analyzeFlow(params: SDETTaskParams['analyze_flow']): Promise<FlowAnalysisResult> {
    return this.execute('analyze_flow', params);
  }

  /**
   * 테스트 코드 생성
   */
  async generateTests(params: SDETTaskParams['generate_tests']): Promise<GeneratedTest[]> {
    return this.execute('generate_tests', params);
  }

  /**
   * Locator 제안
   */
  async suggestLocator(params: SDETTaskParams['suggest_locator']) {
    return this.execute('suggest_locator', params);
  }

  /**
   * 전체 파이프라인: URL에서 POM + 테스트 생성
   */
  async fullPipeline(params: {
    url: string;
    html: string;
    requirement: string;
  }): Promise<{
    pom: GeneratedPOM;
    analysis: FlowAnalysisResult;
    tests: GeneratedTest[];
  }> {
    this.log('Starting full pipeline...');

    // 1. POM 생성
    this.log('Step 1: Generating Page Object Model');
    const pom = await this.generatePOM({
      html: params.html,
      url: params.url,
    });

    // 2. 흐름 분석
    this.log('Step 2: Analyzing user flows');
    const analysis = await this.analyzeFlow({
      url: params.url,
      html: params.html,
      requirement: params.requirement,
    });

    // 3. 테스트 생성
    this.log('Step 3: Generating tests');
    const tests = await this.generateTests({
      analysis,
      pageObjectCode: pom.code,
      pageClassName: pom.className,
    });

    this.log('Pipeline complete');

    return { pom, analysis, tests };
  }

  /**
   * Agent Coordinator용 핸들러 생성
   */
  toHandler(): AgentHandler {
    return {
      type: 'sdet',
      execute: async (task: string, params: Record<string, unknown>) => {
        return this.execute(task as SDETTask, params as SDETTaskParams[SDETTask]);
      },
    };
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[SDET Agent] ${message}`);
    }
  }
}

// 편의를 위한 팩토리 함수
export function createSDETAgent(config?: SDETAgentConfig): SDETAgent {
  return new SDETAgent(config);
}

// Re-export types and classes
export { POMGenerator, type GeneratedPOM, type LocatorInfo, type ActionInfo } from './pom-generator.js';
export { SelfHealer, type HealResult, type TestFailure, type FailureAnalysis, type ProposedFix } from './self-healer.js';
export { FlowAnalyzer, type FlowAnalysisResult, type TestScenario, type GeneratedTest } from './flow-analyzer.js';
