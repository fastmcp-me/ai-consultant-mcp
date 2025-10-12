#!/usr/bin/env node

/**
 * AI Consultant MCP Server - Entry Point
 * Bootstraps the application with dependency injection
 */

import { Config } from "./config/Config.js";
import { Cache } from "./infrastructure/Cache.js";
import { HistoryManager } from "./infrastructure/HistoryManager.js";
import { RateLimiter } from "./utils/RateLimiter.js";
import { CircuitBreakerWrapper } from "./utils/CircuitBreakerWrapper.js";
import { configureAxiosRetry } from "./utils/RetryConfig.js";
import { ModelSelector } from "./services/ModelSelector.js";
import { ApiClient } from "./services/ApiClient.js";
import { ConsultationService } from "./services/ConsultationService.js";
import { MCPServer } from "./mcp/MCPServer.js";
import type { ConsultResult } from "./types/index.js";

/**
 * Application bootstrap
 */
async function main() {
  try {
    // Load configuration
    const config = Config.getInstance();
    console.error("Configuration loaded successfully");

    // Configure axios retry logic
    configureAxiosRetry(config.retryAttempts);

    // Initialize infrastructure
    const cache = new Cache<ConsultResult>({
      ttl: config.cacheTtlSeconds,
      checkPeriod: 60,
    });

    const historyManager = new HistoryManager(config.maxConversationHistory);

    const rateLimiter = new RateLimiter(config.rateLimitPerMinute);

    // Initialize services
    const modelSelector = new ModelSelector();

    // Create API client with circuit breaker
    const apiClient = createApiClient(config);

    // Create consultation service with all dependencies
    const consultationService = new ConsultationService(
      apiClient,
      modelSelector,
      cache,
      historyManager,
      rateLimiter,
    );

    // Create and start MCP server
    const mcpServer = new MCPServer(consultationService);
    await mcpServer.start();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

/**
 * Create API client with circuit breaker
 */
function createApiClient(config: Config): ApiClient {
  // Create a wrapper function that matches the circuit breaker signature
  const makeApiCallWrapper = async (...args: unknown[]) => {
    const [model, messages] = args as [string, any[]];
    const tempClient = new ApiClient(config.openRouterApiKey, null as any);
    return tempClient.makeApiCall(model, messages);
  };

  // Create circuit breaker wrapping the API call
  const circuitBreaker = new CircuitBreakerWrapper(
    makeApiCallWrapper,
    {
      timeout: config.circuitBreakerTimeout,
      errorThresholdPercentage: config.circuitBreakerThreshold * 100,
      resetTimeout: config.circuitBreakerResetTimeout,
    },
  );

  // Create the actual ApiClient with the circuit breaker
  return new ApiClient(config.openRouterApiKey, circuitBreaker);
}

// Start the application
main();

