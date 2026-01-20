import { z } from 'zod';

export const AgentConfigSchema = z.object({
  sdet: z.object({
    enabled: z.boolean().default(true),
    model: z.string().default('claude-sonnet-4-20250514'),
    maxTokens: z.number().default(4096),
    temperature: z.number().default(0.3),
    locatorStrategy: z.object({
      priority: z.array(z.string()).default([
        'data-testid',
        'aria-label',
        'role',
        'text',
        'css',
      ]),
      avoidFragileSelectors: z.boolean().default(true),
    }),
    selfHealing: z.object({
      enabled: z.boolean().default(true),
      maxRetries: z.number().default(3),
      autoCommit: z.boolean().default(false),
    }),
  }),
  documentation: z.object({
    enabled: z.boolean().default(true),
    model: z.string().default('claude-sonnet-4-20250514'),
    maxTokens: z.number().default(4096),
    outputFormats: z.array(z.string()).default(['gherkin', 'markdown']),
    dailyDigest: z.object({
      enabled: z.boolean().default(true),
      schedule: z.string().default('0 9 * * *'), // 매일 오전 9시
      slackWebhook: z.string().optional(),
    }),
  }),
  analysis: z.object({
    enabled: z.boolean().default(true),
    model: z.string().default('claude-sonnet-4-20250514'),
    maxTokens: z.number().default(4096),
    snapshotRetention: z.number().default(30), // 일
    flakyThreshold: z.number().default(0.1), // 10% 이상 실패 시 flaky로 판단
  }),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const defaultConfig: AgentConfig = {
  sdet: {
    enabled: true,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.3,
    locatorStrategy: {
      priority: ['data-testid', 'aria-label', 'role', 'text', 'css'],
      avoidFragileSelectors: true,
    },
    selfHealing: {
      enabled: true,
      maxRetries: 3,
      autoCommit: false,
    },
  },
  documentation: {
    enabled: true,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    outputFormats: ['gherkin', 'markdown'],
    dailyDigest: {
      enabled: true,
      schedule: '0 9 * * *',
    },
  },
  analysis: {
    enabled: true,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    snapshotRetention: 30,
    flakyThreshold: 0.1,
  },
};
