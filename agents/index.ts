/**
 * AI-Driven E2E Testing System - Agent Exports
 *
 * This module exports all agents and utilities for the AI-driven E2E testing system.
 */

// Coordinator
export {
  AgentCoordinator,
  getCoordinator,
  MessageBus,
  getMessageBus,
  ContextStore,
  getContextStore,
  type AgentHandler,
  type TaskRequest,
  type TaskResult,
  type AgentType,
  type AgentMessage,
  type SharedContext,
  type TestContext,
  type AgentContext,
} from './coordinator/index.js';

// SDET Agent
export {
  SDETAgent,
  createSDETAgent,
  POMGenerator,
  SelfHealer,
  FlowAnalyzer,
  type SDETTask,
  type SDETTaskParams,
  type SDETTaskResults,
  type GeneratedPOM,
  type LocatorInfo,
  type ActionInfo,
  type HealResult,
  type TestFailure,
  type FailureAnalysis,
  type ProposedFix,
  type FlowAnalysisResult,
  type TestScenario,
  type GeneratedTest,
} from './sdet/index.js';

// Documentation Agent
export {
  DocumentationAgent,
  createDocumentationAgent,
  type DocTask,
  type TestSpec,
  type GherkinFeature,
  type DailyDigest,
} from './documentation/index.js';

// Analysis Agent
export {
  AnalysisAgent,
  createAnalysisAgent,
  type AnalysisTask,
  type TestRun,
  type TestResult,
  type FlakyTestReport,
  type RunComparison,
} from './analysis/index.js';

/**
 * Initialize all agents and register them with the coordinator
 */
export function initializeAgents(options?: {
  verbose?: boolean;
}): {
  coordinator: import('./coordinator/index.js').AgentCoordinator;
  sdet: import('./sdet/index.js').SDETAgent;
  documentation: import('./documentation/index.js').DocumentationAgent;
  analysis: import('./analysis/index.js').AnalysisAgent;
} {
  const { getCoordinator } = require('./coordinator/index.js');
  const { createSDETAgent } = require('./sdet/index.js');
  const { createDocumentationAgent } = require('./documentation/index.js');
  const { createAnalysisAgent } = require('./analysis/index.js');

  const verbose = options?.verbose ?? false;

  const coordinator = getCoordinator({ verbose });
  const sdet = createSDETAgent({ verbose });
  const documentation = createDocumentationAgent({ verbose });
  const analysis = createAnalysisAgent({ verbose });

  // Register agents with coordinator
  coordinator.registerAgent(sdet.toHandler());
  coordinator.registerAgent(documentation.toHandler());
  coordinator.registerAgent(analysis.toHandler());

  return { coordinator, sdet, documentation, analysis };
}
