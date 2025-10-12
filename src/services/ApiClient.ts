/**
 * OpenRouter API client
 * Handles API calls with circuit breaker and error handling
 */

import axios, { AxiosError } from "axios";
import type {
  IApiClient,
  ConsultResult,
  OpenRouterMessage,
  OpenRouterResponse,
  ICircuitBreaker,
} from "../types/index.js";
import { ApiError } from "../types/index.js";
import { Config } from "../config/Config.js";

export class ApiClient implements IApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly circuitBreaker: ICircuitBreaker;
  private readonly config: Config;

  constructor(apiKey: string, circuitBreaker: ICircuitBreaker) {
    this.apiKey = apiKey;
    this.baseUrl = "https://openrouter.ai/api/v1/chat/completions";
    this.circuitBreaker = circuitBreaker;
    this.config = Config.getInstance();
  }

  /**
   * Consult AI model via OpenRouter API
   */
  public async consultAI(
    prompt: string,
    model: string,
    conversationHistory: OpenRouterMessage[] = [],
  ): Promise<ConsultResult> {
    try {
      // Build messages array with history
      const messages: OpenRouterMessage[] = [
        ...conversationHistory,
        {
          role: "user",
          content: prompt,
        },
      ];

      if (this.config.verboseLogging) {
        console.error(`[API] Sending request to OpenRouter`);
        console.error(`[API] Model: ${model}`);
        console.error(`[API] Message count: ${messages.length}`);
        console.error(`[API] Total characters: ${messages.reduce((sum, m) => sum + m.content.length, 0)}`);
      }

      // Make API call through circuit breaker
      const startTime = Date.now();
      const response = await this.circuitBreaker.fire<OpenRouterResponse>(
        model,
        messages,
      );
      const apiDuration = Date.now() - startTime;

      if (this.config.verboseLogging) {
        console.error(`[API] Response received in ${apiDuration}ms`);
        console.error(`[API] Tokens - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`);
      }

      return {
        model,
        response: response.choices[0].message.content,
        usage: response.usage,
      };
    } catch (error) {
      if (this.config.verboseLogging) {
        console.error(`[API] Request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Make the actual API call to OpenRouter
   * This is the function wrapped by the circuit breaker
   */
  public async makeApiCall(
    model: string,
    messages: OpenRouterMessage[],
  ): Promise<OpenRouterResponse> {
    try {
      if (this.config.verboseLogging) {
        console.error(`[API] Making HTTP POST to ${this.baseUrl}`);
      }

      const response = await axios.post<OpenRouterResponse>(
        this.baseUrl,
        {
          model,
          messages,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "X-Title": "AI Consultant MCP",
            "Content-Type": "application/json",
          },
        },
      );

      if (this.config.verboseLogging) {
        console.error(`[API] HTTP ${response.status} ${response.statusText}`);
      }

      return response.data;
    } catch (error) {
      if (this.config.verboseLogging) {
        console.error(`[API] HTTP request failed`);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors with proper error types
   */
  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;
      const message =
        axiosError.response?.data?.error?.message ||
        axiosError.message ||
        "Unknown API error";
      const statusCode = axiosError.response?.status;

      return new ApiError(
        `OpenRouter API error: ${message}`,
        statusCode,
        axiosError,
      );
    }

    if (error instanceof Error) {
      return new ApiError(`API error: ${error.message}`, undefined, error);
    }

    return new ApiError("Unknown API error occurred");
  }
}

