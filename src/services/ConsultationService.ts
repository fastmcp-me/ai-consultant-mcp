/**
 * Consultation service
 * Orchestrates the AI consultation workflow with caching, rate limiting, and history management
 */

import type {
  IApiClient,
  IModelSelector,
  ICache,
  IHistoryManager,
  IRateLimiter,
  ConsultArgs,
  ConsultResult,
  OpenRouterMessage,
} from "../types/index.js";
import { generateCacheKey } from "../infrastructure/Cache.js";
import { Config } from "../config/Config.js";

export class ConsultationService {
  private readonly config: Config;

  constructor(
    private readonly apiClient: IApiClient,
    private readonly modelSelector: IModelSelector,
    private readonly cache: ICache<ConsultResult>,
    private readonly historyManager: IHistoryManager,
    private readonly rateLimiter: IRateLimiter,
  ) {
    this.config = Config.getInstance();
  }

  /**
   * Consult with AI model (single or multiple models)
   */
  public async consult(args: ConsultArgs): Promise<ConsultResult> {
    const {
      prompt,
      model,
      models,
      task_description,
      conversation_id,
      clear_history = false,
    } = args;

    // If multiple models specified, use multi-model consultation
    if (models && models.length > 0) {
      return this.consultMultipleModels(args);
    }

    // Check rate limit
    const rateLimitId = conversation_id || "global";
    if (this.config.verboseLogging) {
      console.error(`[Service] Checking rate limit for: ${rateLimitId}`);
    }
    this.rateLimiter.checkLimit(rateLimitId);

    // Clear history if requested
    if (clear_history && conversation_id) {
      if (this.config.verboseLogging) {
        console.error(`[Service] Clearing conversation history for: ${conversation_id}`);
      }
      this.historyManager.clearHistory(conversation_id);
    }

    // Select model
    const selectedModel = this.selectModel(model, task_description, prompt);
    if (this.config.verboseLogging) {
      console.error(`[Service] Selected model: ${selectedModel}`);
    }

    // Check cache (only for non-conversation queries)
    if (!conversation_id) {
      const cachedResult = this.checkCache(prompt, selectedModel);
      if (cachedResult) {
        if (this.config.verboseLogging) {
          console.error("[Service] Returning cached result");
        }
        return {
          ...cachedResult,
          model: `${selectedModel} (cached)`,
        };
      }
    }

    // Get conversation history
    const history = conversation_id
      ? this.historyManager.getHistory(conversation_id)
      : [];

    if (this.config.verboseLogging && conversation_id) {
      console.error(`[Service] Loaded ${history.length} messages from conversation history`);
    }

    // Make API call
    if (this.config.verboseLogging) {
      console.error(`[Service] Making API call to OpenRouter with model: ${selectedModel}`);
    }
    const result = await this.apiClient.consultAI(
      prompt,
      selectedModel,
      history,
    );

    // Update conversation history if conversation_id provided
    if (conversation_id) {
      const userMessage: OpenRouterMessage = {
        role: "user",
        content: prompt,
      };
      const assistantMessage: OpenRouterMessage = {
        role: "assistant",
        content: result.response,
      };
      if (this.config.verboseLogging) {
        console.error(`[Service] Updating conversation history for: ${conversation_id}`);
      }
      this.historyManager.updateHistory(
        conversation_id,
        userMessage,
        assistantMessage,
      );
    }

    // Cache result (only for non-conversation queries)
    if (!conversation_id) {
      if (this.config.verboseLogging) {
        console.error("[Service] Caching result");
      }
      this.cacheResult(prompt, selectedModel, result);
    }

    return result;
  }

  /**
   * Consult with multiple AI models sequentially
   */
  private async consultMultipleModels(args: ConsultArgs): Promise<ConsultResult> {
    const {
      prompt,
      models,
      conversation_id,
      clear_history = false,
    } = args;

    if (!models || models.length === 0) {
      throw new Error("No models specified for multi-model consultation");
    }

    if (this.config.verboseLogging) {
      console.error(`[Service] Starting multi-model consultation with ${models.length} models`);
      console.error(`[Service] Models: ${models.join(", ")}`);
    }

    // Check rate limit
    const rateLimitId = conversation_id || "global";
    this.rateLimiter.checkLimit(rateLimitId);

    // Clear history if requested
    if (clear_history && conversation_id) {
      if (this.config.verboseLogging) {
        console.error(`[Service] Clearing conversation history for: ${conversation_id}`);
      }
      this.historyManager.clearHistory(conversation_id);
    }

    const results: Array<{
      model: string;
      response: string;
      usage: any;
      cached: boolean;
    }> = [];

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;

    // Consult each model sequentially
    for (const modelId of models) {
      if (this.config.verboseLogging) {
        console.error(`[Service] Consulting model: ${modelId}`);
      }

      try {
        // Validate and get full model ID
        const modelConfig = this.modelSelector.getModelById(modelId);
        const selectedModel = modelConfig ? modelConfig.id : modelId;

        // Get conversation history
        const history = conversation_id
          ? this.historyManager.getHistory(conversation_id)
          : [];

        // Check cache (only for non-conversation queries)
        let result;
        let isCached = false;
        if (!conversation_id) {
          const cachedResult = this.checkCache(prompt, selectedModel);
          if (cachedResult) {
            result = cachedResult;
            isCached = true;
            if (this.config.verboseLogging) {
              console.error(`[Service] Using cached result for model: ${modelId}`);
            }
          }
        }

        // Make API call if not cached
        if (!result) {
          result = await this.apiClient.consultAI(
            prompt,
            selectedModel,
            history,
          );

          // Cache result (only for non-conversation queries)
          if (!conversation_id) {
            this.cacheResult(prompt, selectedModel, result);
          }
        }

        // Collect result
        results.push({
          model: modelId,
          response: result.response,
          usage: result.usage,
          cached: isCached,
        });

        // Aggregate token usage
        totalPromptTokens += result.usage.prompt_tokens || 0;
        totalCompletionTokens += result.usage.completion_tokens || 0;
        totalTokens += result.usage.total_tokens || 0;

        if (this.config.verboseLogging) {
          console.error(`[Service] Completed consultation with ${modelId}`);
        }
      } catch (error) {
        console.error(`[Service] Error consulting model ${modelId}:`, error);
        // Continue with other models even if one fails
        results.push({
          model: modelId,
          response: `Error: ${error instanceof Error ? error.message : String(error)}`,
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          cached: false,
        });
      }
    }

    // Combine responses
    const combinedResponse = this.combineResponses(results);

    // Update conversation history if conversation_id provided
    if (conversation_id) {
      const userMessage: OpenRouterMessage = {
        role: "user",
        content: prompt,
      };
      const assistantMessage: OpenRouterMessage = {
        role: "assistant",
        content: combinedResponse,
      };
      this.historyManager.updateHistory(
        conversation_id,
        userMessage,
        assistantMessage,
      );
    }

    // Return combined result in ConsultResult format
    return {
      model: `Multi-model: ${models.join(", ")}`,
      response: combinedResponse,
      usage: {
        prompt_tokens: totalPromptTokens,
        completion_tokens: totalCompletionTokens,
        total_tokens: totalTokens,
      },
    };
  }

  /**
   * Combine responses from multiple models
   */
  private combineResponses(
    results: Array<{
      model: string;
      response: string;
      usage: any;
      cached: boolean;
    }>,
  ): string {
    let combined = "# Multi-Model Consultation Results\n\n";

    results.forEach((result, index) => {
      combined += `## Model ${index + 1}: ${result.model}${result.cached ? " (cached)" : ""}\n\n`;
      combined += `${result.response}\n\n`;
      combined += `**Tokens used:** ${result.usage.total_tokens || 0}\n\n`;
      combined += "---\n\n";
    });

    return combined;
  }

  /**
   * Select appropriate model
   */
  private selectModel(
    explicitModel: string | undefined,
    taskDescription: string | undefined,
    prompt: string,
  ): string {
    // If explicit model provided, validate and use it
    if (explicitModel) {
      const modelConfig = this.modelSelector.getModelById(explicitModel);
      if (modelConfig) {
        return modelConfig.id;
      }
      // If invalid model ID, fall through to auto-selection
      console.warn(
        `Invalid model ID: ${explicitModel}. Using auto-selection.`,
      );
    }

    // Auto-select based on task description or prompt
    const description = taskDescription || prompt;
    const modelConfig = this.modelSelector.selectModel(description);
    return modelConfig.id;
  }

  /**
   * Check cache for existing result
   */
  private checkCache(
    prompt: string,
    model: string,
  ): ConsultResult | undefined {
    const cacheKey = generateCacheKey(prompt, model);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      if (this.config.verboseLogging) {
        console.error("[Service] Cache hit for query");
      } else {
        console.error("Cache hit for query");
      }
    } else if (this.config.verboseLogging) {
      console.error("[Service] Cache miss for query");
    }

    return cached;
  }

  /**
   * Cache consultation result
   */
  private cacheResult(
    prompt: string,
    model: string,
    result: ConsultResult,
  ): void {
    const cacheKey = generateCacheKey(prompt, model);
    this.cache.set(cacheKey, result);
  }

  /**
   * List all available models
   */
  public listModels() {
    const models = this.modelSelector.getAllModels();
    return Object.entries(models).map(([key, model]) => ({
      name: key,
      id: model.id,
      description: model.description,
      bestFor: model.bestFor,
    }));
  }
}

