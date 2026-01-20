import { getConfig } from '../../core/config.js';
import {
  MessageBus,
  getMessageBus,
  type AgentType,
  type AgentMessage,
} from './message-bus.js';
import { ContextStore, getContextStore } from './context-store.js';

export interface TaskRequest {
  agent: AgentType;
  task: string;
  params: Record<string, unknown>;
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

export interface AgentHandler {
  type: AgentType;
  execute: (task: string, params: Record<string, unknown>) => Promise<unknown>;
}

export class AgentCoordinator {
  private messageBus: MessageBus;
  private contextStore: ContextStore;
  private agents: Map<AgentType, AgentHandler> = new Map();
  private verbose: boolean;

  constructor(options?: { verbose?: boolean }) {
    this.messageBus = getMessageBus();
    this.contextStore = getContextStore();
    this.verbose = options?.verbose ?? false;

    // 코디네이터 메시지 핸들러 등록
    this.messageBus.subscribe('coordinator', this.handleMessage.bind(this));
  }

  /**
   * 에이전트 등록
   */
  registerAgent(handler: AgentHandler): void {
    this.agents.set(handler.type, handler);
    this.log(`Agent registered: ${handler.type}`);

    // 에이전트 메시지 핸들러 등록
    this.messageBus.subscribe(handler.type, async (message) => {
      if (message.type === 'task:request') {
        await this.executeAgentTask(handler.type, message);
      }
    });
  }

  /**
   * 태스크 실행
   */
  async execute(request: TaskRequest): Promise<TaskResult> {
    const startTime = Date.now();

    this.log(`Executing task: ${request.agent}/${request.task}`);
    this.contextStore.updateAgentStatus(request.agent, {
      status: 'busy',
      currentTask: request.task,
    });

    try {
      const handler = this.agents.get(request.agent);
      if (!handler) {
        throw new Error(`Agent not registered: ${request.agent}`);
      }

      const result = await handler.execute(request.task, request.params);
      const duration = Date.now() - startTime;

      this.contextStore.recordTaskCompletion(request.agent, true, duration);
      this.log(`Task completed: ${request.agent}/${request.task} (${duration}ms)`);

      return {
        success: true,
        data: result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.contextStore.recordTaskCompletion(request.agent, false, duration);
      this.log(`Task failed: ${request.agent}/${request.task} - ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * 다른 에이전트에게 작업 위임
   */
  async delegate<T>(
    from: AgentType,
    to: AgentType,
    task: string,
    params: Record<string, unknown>
  ): Promise<T> {
    this.log(`Delegating: ${from} -> ${to}/${task}`);
    return this.messageBus.request<T>(from, to, { task, params });
  }

  /**
   * 이벤트 브로드캐스트
   */
  async broadcast(
    from: AgentType | 'coordinator',
    eventType: 'event:test_failed' | 'event:test_passed' | 'event:dom_changed' | 'event:code_modified',
    payload: unknown
  ): Promise<void> {
    await this.messageBus.publish({
      from,
      to: 'broadcast',
      type: eventType,
      payload,
    });
  }

  /**
   * 현재 상태 가져오기
   */
  getStatus(): {
    agents: Record<AgentType, { status: string; currentTask?: string }>;
    currentTest?: { url: string; status: string };
  } {
    const context = this.contextStore.getContext();
    return {
      agents: {
        sdet: {
          status: context.agents.sdet.status,
          currentTask: context.agents.sdet.currentTask,
        },
        documentation: {
          status: context.agents.documentation.status,
          currentTask: context.agents.documentation.currentTask,
        },
        analysis: {
          status: context.agents.analysis.status,
          currentTask: context.agents.analysis.currentTask,
        },
      },
      currentTest: context.currentTest
        ? { url: context.currentTest.url, status: context.currentTest.status }
        : undefined,
    };
  }

  /**
   * 메트릭 가져오기
   */
  getMetrics(): Record<AgentType, { completed: number; errored: number; avgTime: number }> {
    const context = this.contextStore.getContext();
    return {
      sdet: {
        completed: context.agents.sdet.metrics.tasksCompleted,
        errored: context.agents.sdet.metrics.tasksErrored,
        avgTime: context.agents.sdet.metrics.avgResponseTimeMs,
      },
      documentation: {
        completed: context.agents.documentation.metrics.tasksCompleted,
        errored: context.agents.documentation.metrics.tasksErrored,
        avgTime: context.agents.documentation.metrics.avgResponseTimeMs,
      },
      analysis: {
        completed: context.agents.analysis.metrics.tasksCompleted,
        errored: context.agents.analysis.metrics.tasksErrored,
        avgTime: context.agents.analysis.metrics.avgResponseTimeMs,
      },
    };
  }

  /**
   * 메시지 로그 가져오기
   */
  getMessageLog(filter?: Parameters<MessageBus['getMessageLog']>[0]) {
    return this.messageBus.getMessageLog(filter);
  }

  private async handleMessage(message: AgentMessage): Promise<void> {
    this.log(`Coordinator received: ${message.type} from ${message.from}`);

    // 코디네이터로 직접 온 작업 요청 처리
    if (message.type === 'task:request') {
      const { task, params } = message.payload as { task: string; params: Record<string, unknown> };
      const targetAgent = params.agent as AgentType;

      const result = await this.execute({
        agent: targetAgent,
        task,
        params,
      });

      await this.messageBus.respond(message, result, !result.success);
    }
  }

  private async executeAgentTask(
    agent: AgentType,
    message: AgentMessage
  ): Promise<void> {
    const { task, params } = message.payload as { task: string; params: Record<string, unknown> };
    const startTime = Date.now();

    this.contextStore.updateAgentStatus(agent, {
      status: 'busy',
      currentTask: task,
    });

    try {
      const handler = this.agents.get(agent);
      if (!handler) {
        throw new Error(`Agent not registered: ${agent}`);
      }

      const result = await handler.execute(task, params);
      const duration = Date.now() - startTime;

      this.contextStore.recordTaskCompletion(agent, true, duration);
      await this.messageBus.respond(message, result);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.contextStore.recordTaskCompletion(agent, false, duration);
      await this.messageBus.respond(message, String(error), true);
    }
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[Coordinator] ${message}`);
    }
  }
}

// Export sub-modules
export { MessageBus, getMessageBus, type AgentType, type AgentMessage } from './message-bus.js';
export { ContextStore, getContextStore, type SharedContext, type TestContext, type AgentContext } from './context-store.js';

// 싱글톤 인스턴스
let defaultCoordinator: AgentCoordinator | null = null;

export function getCoordinator(options?: { verbose?: boolean }): AgentCoordinator {
  if (!defaultCoordinator) {
    defaultCoordinator = new AgentCoordinator(options);
  }
  return defaultCoordinator;
}
