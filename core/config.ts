import dotenv from 'dotenv';
import { AgentConfigSchema, defaultConfig, type AgentConfig } from '../config/agents.config.js';

// Load environment variables
dotenv.config();

export type AIProvider = 'gemini' | 'anthropic';

export interface AppConfig {
  aiProvider: AIProvider;
  apiKey: string;
  baseUrl: string;
  agents: AgentConfig;
  ci: boolean;
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Gemini 또는 Anthropic API 키 확인
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  let aiProvider: AIProvider;
  let apiKey: string;

  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    aiProvider = 'gemini';
    apiKey = geminiKey;
  } else if (anthropicKey && anthropicKey !== 'your_api_key_here') {
    aiProvider = 'anthropic';
    apiKey = anthropicKey;
  } else {
    throw new Error(
      'API key is required. Please set GEMINI_API_KEY or ANTHROPIC_API_KEY in your .env file.'
    );
  }

  // 환경 변수에서 에이전트 설정 오버라이드
  const agentOverrides: Partial<AgentConfig> = {};

  if (process.env.AGENT_MODEL) {
    agentOverrides.sdet = {
      ...defaultConfig.sdet,
      model: process.env.AGENT_MODEL,
    };
    agentOverrides.documentation = {
      ...defaultConfig.documentation,
      model: process.env.AGENT_MODEL,
    };
    agentOverrides.analysis = {
      ...defaultConfig.analysis,
      model: process.env.AGENT_MODEL,
    };
  }

  if (process.env.SELF_HEALING_ENABLED) {
    agentOverrides.sdet = {
      ...(agentOverrides.sdet || defaultConfig.sdet),
      selfHealing: {
        ...defaultConfig.sdet.selfHealing,
        enabled: process.env.SELF_HEALING_ENABLED === 'true',
      },
    };
  }

  const mergedAgentConfig: AgentConfig = {
    ...defaultConfig,
    ...agentOverrides,
  };

  // Zod로 검증
  const validatedAgentConfig = AgentConfigSchema.parse(mergedAgentConfig);

  cachedConfig = {
    aiProvider,
    apiKey,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    agents: validatedAgentConfig,
    ci: process.env.CI === 'true',
  };

  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}

// 타입 내보내기
export type { AgentConfig };
