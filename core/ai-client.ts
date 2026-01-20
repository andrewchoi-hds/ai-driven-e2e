import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { z } from 'zod';

export type AIProvider = 'gemini' | 'anthropic';

export interface AIClientConfig {
  provider?: AIProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: string | null;
}

export class AIClient {
  private provider: AIProvider;
  private geminiModel: GenerativeModel | null = null;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AIClientConfig) {
    this.provider = config.provider || 'gemini';
    this.model = config.model || this.getDefaultModel();
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.3;

    if (this.provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(config.apiKey);
      this.geminiModel = genAI.getGenerativeModel({ model: this.model });
    }
  }

  private getDefaultModel(): string {
    switch (this.provider) {
      case 'gemini':
        return 'gemini-1.5-flash';
      case 'anthropic':
        return 'claude-sonnet-4-20250514';
      default:
        return 'gemini-1.5-flash';
    }
  }

  async chat(
    messages: Message[],
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<AIResponse> {
    if (this.provider === 'gemini') {
      return this.chatWithGemini(messages, options);
    }
    throw new Error(`Provider ${this.provider} not fully implemented`);
  }

  private async chatWithGemini(
    messages: Message[],
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<AIResponse> {
    if (!this.geminiModel) {
      throw new Error('Gemini model not initialized');
    }

    // Gemini 형식으로 변환
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    // 시스템 프롬프트가 있으면 첫 번째 메시지에 포함
    let prompt = lastMessage.content;
    if (options?.system && messages.length === 1) {
      prompt = `${options.system}\n\n${prompt}`;
    }

    const chat = this.geminiModel.startChat({
      history: history as { role: 'user' | 'model'; parts: { text: string }[] }[],
      generationConfig: {
        maxOutputTokens: options?.maxTokens || this.maxTokens,
        temperature: options?.temperature ?? this.temperature,
      },
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const text = response.text();

    return {
      content: text,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
      stopReason: response.candidates?.[0]?.finishReason || null,
    };
  }

  async complete(
    prompt: string,
    options?: {
      system?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    const response = await this.chat(
      [{ role: 'user', content: prompt }],
      options
    );
    return response.content;
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options?: {
      system?: string;
      maxTokens?: number;
    }
  ): Promise<T> {
    const systemPrompt = `${options?.system || ''}

You must respond with valid JSON that matches this schema:
${JSON.stringify(zodToJsonSchema(schema), null, 2)}

Respond ONLY with the JSON, no additional text or markdown code blocks.`;

    const response = await this.complete(prompt, {
      ...options,
      system: systemPrompt,
      temperature: 0, // 구조화된 출력은 deterministic하게
    });

    // JSON 추출 (마크다운 코드블록 처리)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    return schema.parse(parsed);
  }
}

// Zod 스키마를 JSON Schema로 변환하는 유틸리티
function zodToJsonSchema(schema: z.ZodType<unknown>): object {
  // 간단한 변환 - 실제 프로덕션에서는 zod-to-json-schema 라이브러리 사용 권장
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema._def.type),
    };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape();
    const properties: Record<string, object> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodType<unknown>);
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema._def.innerType);
  }
  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema._def.values,
    };
  }

  return { type: 'object' };
}

// 싱글톤 인스턴스 생성 헬퍼
let defaultClient: AIClient | null = null;

export function getAIClient(config?: AIClientConfig): AIClient {
  if (config) {
    return new AIClient(config);
  }

  if (!defaultClient) {
    // Gemini API 키 먼저 확인, 없으면 Anthropic
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (geminiKey) {
      defaultClient = new AIClient({
        provider: 'gemini',
        apiKey: geminiKey,
        model: process.env.AGENT_MODEL,
        maxTokens: process.env.AGENT_MAX_TOKENS
          ? parseInt(process.env.AGENT_MAX_TOKENS)
          : undefined,
        temperature: process.env.AGENT_TEMPERATURE
          ? parseFloat(process.env.AGENT_TEMPERATURE)
          : undefined,
      });
    } else if (anthropicKey) {
      defaultClient = new AIClient({
        provider: 'anthropic',
        apiKey: anthropicKey,
        model: process.env.AGENT_MODEL,
        maxTokens: process.env.AGENT_MAX_TOKENS
          ? parseInt(process.env.AGENT_MAX_TOKENS)
          : undefined,
        temperature: process.env.AGENT_TEMPERATURE
          ? parseFloat(process.env.AGENT_TEMPERATURE)
          : undefined,
      });
    } else {
      throw new Error(
        'API key is required. Set GEMINI_API_KEY or ANTHROPIC_API_KEY in your .env file.'
      );
    }
  }

  return defaultClient;
}

// 클라이언트 리셋 (테스트용)
export function resetAIClient(): void {
  defaultClient = null;
}
