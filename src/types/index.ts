/**
 * Centralized type definitions for the AI Consultant MCP Server
 */

// ============================================================================
// Model Types
// ============================================================================

export enum ModelType {
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GPT_5_CODEX = "gpt-5-codex",
  GROK_CODE_FAST_1 = "grok-code-fast-1",
}

export interface ModelConfig {
  readonly id: string;
  readonly description: string;
  readonly bestFor: readonly string[];
}

export type AvailableModels = {
  readonly [key in ModelType]: ModelConfig;
};

// ============================================================================
// API Types
// ============================================================================

export interface OpenRouterMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ConsultResult {
  model: string;
  response: string;
  usage: TokenUsage;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface ConsultArgs {
  prompt: string;
  model?: string;
  models?: string[]; // For sequential multi-model consultation
  task_description?: string;
  conversation_id?: string;
  clear_history?: boolean;
}

export interface ConsultResponse {
  model_used: string;
  response: string;
  tokens_used: TokenUsage;
  conversation_id: string | null;
  cached: boolean;
}

export interface ModelResponse {
  model: string;
  response: string;
  tokens_used: TokenUsage;
  cached: boolean;
}

export interface MultiModelConsultResponse {
  models_used: string[];
  responses: ModelResponse[];
  combined_response: string;
  total_tokens_used: TokenUsage;
  conversation_id: string | null;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface IRateLimiter {
  checkLimit(identifier: string): void;
  reset(identifier: string): void;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface ICache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}

export interface CacheOptions {
  ttl: number; // Time to live in seconds
  checkPeriod?: number; // Check period in seconds
}

// ============================================================================
// History Types
// ============================================================================

export interface IHistoryManager {
  getHistory(conversationId: string): OpenRouterMessage[];
  updateHistory(
    conversationId: string,
    userMessage: OpenRouterMessage,
    assistantMessage: OpenRouterMessage,
  ): void;
  clearHistory(conversationId: string): void;
  hasHistory(conversationId: string): boolean;
}

// ============================================================================
// Circuit Breaker Types
// ============================================================================

export enum CircuitBreakerState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerOptions {
  timeout: number; // Request timeout in ms
  errorThresholdPercentage: number; // 0-100
  resetTimeout: number; // Time before attempting to close circuit in ms
}

export interface ICircuitBreaker {
  fire<T>(...args: unknown[]): Promise<T>;
  getState(): CircuitBreakerState;
}

// ============================================================================
// Retry Types
// ============================================================================

export interface RetryOptions {
  retries: number;
  retryDelay?: (retryCount: number) => number;
  retryCondition?: (error: Error) => boolean;
}

// ============================================================================
// Model Selection Types
// ============================================================================

export interface IModelSelector {
  selectModel(taskDescription: string): ModelConfig;
  getModelById(modelId: string): ModelConfig | undefined;
  getAllModels(): AvailableModels;
}

// ============================================================================
// API Client Types
// ============================================================================

export interface IApiClient {
  consultAI(
    prompt: string,
    model: string,
    conversationHistory: OpenRouterMessage[],
  ): Promise<ConsultResult>;
}

// ============================================================================
// Error Types
// ============================================================================

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly waitTimeSeconds: number,
  ) {
    super(message);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitBreakerError";
    Object.setPrototypeOf(this, CircuitBreakerError.prototype);
  }
}

// ============================================================================
// MCP Types
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

