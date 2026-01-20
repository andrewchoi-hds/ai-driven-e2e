import type { AgentType } from './message-bus.js';

export interface TestContext {
  url: string;
  testFile: string;
  testName: string;
  status: 'running' | 'passed' | 'failed';
  startedAt: Date;
  finishedAt?: Date;
  error?: string;
  screenshots?: string[];
  domSnapshots?: string[];
}

export interface AgentContext {
  agent: AgentType;
  currentTask?: string;
  status: 'idle' | 'busy' | 'error';
  lastActivity: Date;
  metrics: {
    tasksCompleted: number;
    tasksErrored: number;
    avgResponseTimeMs: number;
  };
}

export interface SharedContext {
  currentTest?: TestContext;
  agents: Record<AgentType, AgentContext>;
  metadata: Record<string, unknown>;
}

export class ContextStore {
  private context: SharedContext;
  private listeners: Map<string, ((context: SharedContext) => void)[]> = new Map();

  constructor() {
    this.context = {
      agents: {
        sdet: this.createAgentContext('sdet'),
        documentation: this.createAgentContext('documentation'),
        analysis: this.createAgentContext('analysis'),
      },
      metadata: {},
    };
  }

  /**
   * 전체 컨텍스트 가져오기
   */
  getContext(): SharedContext {
    return { ...this.context };
  }

  /**
   * 특정 에이전트 컨텍스트 가져오기
   */
  getAgentContext(agent: AgentType): AgentContext {
    return { ...this.context.agents[agent] };
  }

  /**
   * 현재 테스트 컨텍스트 가져오기
   */
  getCurrentTest(): TestContext | undefined {
    return this.context.currentTest ? { ...this.context.currentTest } : undefined;
  }

  /**
   * 테스트 시작
   */
  startTest(test: Omit<TestContext, 'status' | 'startedAt'>): void {
    this.context.currentTest = {
      ...test,
      status: 'running',
      startedAt: new Date(),
    };
    this.notifyListeners('test');
  }

  /**
   * 테스트 완료
   */
  finishTest(status: 'passed' | 'failed', error?: string): void {
    if (this.context.currentTest) {
      this.context.currentTest.status = status;
      this.context.currentTest.finishedAt = new Date();
      if (error) {
        this.context.currentTest.error = error;
      }
      this.notifyListeners('test');
    }
  }

  /**
   * 에이전트 상태 업데이트
   */
  updateAgentStatus(
    agent: AgentType,
    updates: Partial<Pick<AgentContext, 'currentTask' | 'status'>>
  ): void {
    const agentContext = this.context.agents[agent];
    if (updates.currentTask !== undefined) {
      agentContext.currentTask = updates.currentTask;
    }
    if (updates.status !== undefined) {
      agentContext.status = updates.status;
    }
    agentContext.lastActivity = new Date();
    this.notifyListeners('agent');
  }

  /**
   * 에이전트 작업 완료 기록
   */
  recordTaskCompletion(
    agent: AgentType,
    success: boolean,
    responseTimeMs: number
  ): void {
    const metrics = this.context.agents[agent].metrics;
    if (success) {
      metrics.tasksCompleted++;
    } else {
      metrics.tasksErrored++;
    }

    // 이동 평균 계산
    const totalTasks = metrics.tasksCompleted + metrics.tasksErrored;
    metrics.avgResponseTimeMs =
      (metrics.avgResponseTimeMs * (totalTasks - 1) + responseTimeMs) / totalTasks;

    this.context.agents[agent].status = 'idle';
    this.context.agents[agent].currentTask = undefined;
    this.notifyListeners('agent');
  }

  /**
   * 메타데이터 설정
   */
  setMetadata(key: string, value: unknown): void {
    this.context.metadata[key] = value;
    this.notifyListeners('metadata');
  }

  /**
   * 메타데이터 가져오기
   */
  getMetadata<T>(key: string): T | undefined {
    return this.context.metadata[key] as T | undefined;
  }

  /**
   * DOM 스냅샷 추가
   */
  addDomSnapshot(snapshotId: string): void {
    if (this.context.currentTest) {
      if (!this.context.currentTest.domSnapshots) {
        this.context.currentTest.domSnapshots = [];
      }
      this.context.currentTest.domSnapshots.push(snapshotId);
    }
  }

  /**
   * 스크린샷 추가
   */
  addScreenshot(path: string): void {
    if (this.context.currentTest) {
      if (!this.context.currentTest.screenshots) {
        this.context.currentTest.screenshots = [];
      }
      this.context.currentTest.screenshots.push(path);
    }
  }

  /**
   * 변경 리스너 등록
   */
  subscribe(
    key: 'test' | 'agent' | 'metadata' | '*',
    listener: (context: SharedContext) => void
  ): () => void {
    const listeners = this.listeners.get(key) || [];
    listeners.push(listener);
    this.listeners.set(key, listeners);

    return () => {
      const currentListeners = this.listeners.get(key) || [];
      const index = currentListeners.indexOf(listener);
      if (index > -1) {
        currentListeners.splice(index, 1);
        this.listeners.set(key, currentListeners);
      }
    };
  }

  /**
   * 컨텍스트 초기화
   */
  reset(): void {
    this.context = {
      agents: {
        sdet: this.createAgentContext('sdet'),
        documentation: this.createAgentContext('documentation'),
        analysis: this.createAgentContext('analysis'),
      },
      metadata: {},
    };
    this.notifyListeners('*');
  }

  private createAgentContext(agent: AgentType): AgentContext {
    return {
      agent,
      status: 'idle',
      lastActivity: new Date(),
      metrics: {
        tasksCompleted: 0,
        tasksErrored: 0,
        avgResponseTimeMs: 0,
      },
    };
  }

  private notifyListeners(key: 'test' | 'agent' | 'metadata' | '*'): void {
    const contextCopy = this.getContext();

    // 특정 키 리스너
    const keyListeners = this.listeners.get(key) || [];
    for (const listener of keyListeners) {
      try {
        listener(contextCopy);
      } catch (error) {
        console.error(`Error in context listener (${key}):`, error);
      }
    }

    // 와일드카드 리스너
    if (key !== '*') {
      const wildcardListeners = this.listeners.get('*') || [];
      for (const listener of wildcardListeners) {
        try {
          listener(contextCopy);
        } catch (error) {
          console.error('Error in context listener (*):', error);
        }
      }
    }
  }
}

// 싱글톤 인스턴스
let defaultStore: ContextStore | null = null;

export function getContextStore(): ContextStore {
  if (!defaultStore) {
    defaultStore = new ContextStore();
  }
  return defaultStore;
}
