export type AgentType = 'sdet' | 'documentation' | 'analysis';

export interface AgentMessage {
  id: string;
  from: AgentType | 'coordinator';
  to: AgentType | 'coordinator' | 'broadcast';
  type: MessageType;
  payload: unknown;
  timestamp: Date;
  correlationId?: string; // 관련 메시지 추적용
}

export type MessageType =
  // 작업 요청
  | 'task:request'
  | 'task:response'
  | 'task:error'
  // 이벤트
  | 'event:test_failed'
  | 'event:test_passed'
  | 'event:dom_changed'
  | 'event:code_modified'
  // 상태
  | 'status:update'
  | 'status:query';

export type MessageHandler = (message: AgentMessage) => Promise<void> | void;

export class MessageBus {
  private handlers: Map<AgentType | 'coordinator', MessageHandler[]> = new Map();
  private messageLog: AgentMessage[] = [];
  private maxLogSize: number = 1000;

  /**
   * 메시지 핸들러 등록
   */
  subscribe(agent: AgentType | 'coordinator', handler: MessageHandler): () => void {
    const handlers = this.handlers.get(agent) || [];
    handlers.push(handler);
    this.handlers.set(agent, handlers);

    // Unsubscribe 함수 반환
    return () => {
      const currentHandlers = this.handlers.get(agent) || [];
      const index = currentHandlers.indexOf(handler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
        this.handlers.set(agent, currentHandlers);
      }
    };
  }

  /**
   * 메시지 발송
   */
  async publish(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.logMessage(fullMessage);

    if (message.to === 'broadcast') {
      // 모든 에이전트에게 발송
      const allAgents: (AgentType | 'coordinator')[] = [
        'sdet',
        'documentation',
        'analysis',
        'coordinator',
      ];
      for (const agent of allAgents) {
        if (agent !== message.from) {
          await this.deliverTo(agent, fullMessage);
        }
      }
    } else {
      await this.deliverTo(message.to, fullMessage);
    }
  }

  /**
   * 요청-응답 패턴
   */
  async request<T>(
    from: AgentType | 'coordinator',
    to: AgentType,
    payload: unknown,
    timeoutMs: number = 30000
  ): Promise<T> {
    const correlationId = this.generateId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Request timeout: ${to} did not respond`));
      }, timeoutMs);

      const unsubscribe = this.subscribe(from, (message) => {
        if (
          message.correlationId === correlationId &&
          message.type === 'task:response'
        ) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(message.payload as T);
        } else if (
          message.correlationId === correlationId &&
          message.type === 'task:error'
        ) {
          clearTimeout(timeout);
          unsubscribe();
          reject(new Error(String(message.payload)));
        }
      });

      this.publish({
        from,
        to,
        type: 'task:request',
        payload,
        correlationId,
      });
    });
  }

  /**
   * 응답 발송
   */
  async respond(
    originalMessage: AgentMessage,
    payload: unknown,
    isError: boolean = false
  ): Promise<void> {
    await this.publish({
      from: originalMessage.to as AgentType | 'coordinator',
      to: originalMessage.from,
      type: isError ? 'task:error' : 'task:response',
      payload,
      correlationId: originalMessage.correlationId || originalMessage.id,
    });
  }

  /**
   * 메시지 로그 조회
   */
  getMessageLog(filter?: {
    from?: AgentType | 'coordinator';
    to?: AgentType | 'coordinator';
    type?: MessageType;
    since?: Date;
  }): AgentMessage[] {
    let messages = [...this.messageLog];

    if (filter?.from) {
      messages = messages.filter((m) => m.from === filter.from);
    }
    if (filter?.to) {
      messages = messages.filter((m) => m.to === filter.to);
    }
    if (filter?.type) {
      messages = messages.filter((m) => m.type === filter.type);
    }
    if (filter?.since) {
      messages = messages.filter((m) => m.timestamp >= filter.since!);
    }

    return messages;
  }

  /**
   * 로그 초기화
   */
  clearLog(): void {
    this.messageLog = [];
  }

  private async deliverTo(
    agent: AgentType | 'coordinator',
    message: AgentMessage
  ): Promise<void> {
    const handlers = this.handlers.get(agent) || [];
    for (const handler of handlers) {
      try {
        await handler(message);
      } catch (error) {
        console.error(`Error delivering message to ${agent}:`, error);
      }
    }
  }

  private logMessage(message: AgentMessage): void {
    this.messageLog.push(message);
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog = this.messageLog.slice(-this.maxLogSize);
    }
  }

  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

// 싱글톤 인스턴스
let defaultBus: MessageBus | null = null;

export function getMessageBus(): MessageBus {
  if (!defaultBus) {
    defaultBus = new MessageBus();
  }
  return defaultBus;
}
