/**
 * MCP Tool Handler
 * Handles tool execution for the MCP server
 */

import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import type {
  ConsultArgs,
  ToolResponse,
  ConsultResponse,
} from "../../types/index.js";
import type { ConsultationService } from "../../services/ConsultationService.js";
import { Config } from "../../config/Config.js";

export class ToolHandler {
  private readonly config: Config;

  constructor(private readonly consultationService: ConsultationService) {
    this.config = Config.getInstance();
  }

  /**
   * Handle tool execution
   */
  public async handleToolCall(request: CallToolRequest): Promise<ToolResponse> {
    const { name, arguments: args } = request.params;

    if (this.config.verboseLogging) {
      console.error(`[MCP] Tool call received: ${name}`);
      console.error(`[MCP] Arguments: ${JSON.stringify(args, null, 2)}`);
    }

    try {
      let result: ToolResponse;

      switch (name) {
        case "list_models":
          result = this.handleListModels();
          break;

        case "consult_ai":
          result = await this.handleConsultAI(args as unknown as ConsultArgs);
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      if (this.config.verboseLogging) {
        console.error(`[MCP] Tool call completed successfully: ${name}`);
      }

      return result;
    } catch (error) {
      if (this.config.verboseLogging) {
        console.error(`[MCP] Tool call failed: ${name}`);
        console.error(`[MCP] Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Handle list_models tool
   */
  private handleListModels(): ToolResponse {
    if (this.config.verboseLogging) {
      console.error("[MCP] Fetching available models list");
    }

    const models = this.consultationService.listModels();

    if (this.config.verboseLogging) {
      console.error(`[MCP] Found ${models.length} available models`);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(models, null, 2),
        },
      ],
    };
  }

  /**
   * Handle consult_ai tool
   */
  private async handleConsultAI(args: ConsultArgs): Promise<ToolResponse> {
    // Validate required arguments
    if (!args.prompt) {
      if (this.config.verboseLogging) {
        console.error("[MCP] Error: prompt is required but not provided");
      }
      throw new Error("prompt is required");
    }

    if (this.config.verboseLogging) {
      console.error("[MCP] Starting AI consultation");
      console.error(`[MCP] Prompt length: ${args.prompt.length} characters`);
      console.error(`[MCP] Requested model: ${args.model || "auto-select"}`);
      console.error(`[MCP] Requested models: ${args.models ? args.models.join(", ") : "none"}`);
      console.error(`[MCP] Task description: ${args.task_description || "none"}`);
      console.error(`[MCP] Conversation ID: ${args.conversation_id || "none"}`);
      console.error(`[MCP] Clear history: ${args.clear_history || false}`);
    }

    // Execute consultation
    const startTime = Date.now();
    const result = await this.consultationService.consult(args);
    const duration = Date.now() - startTime;

    // Log AI response if verbose logging is enabled
    if (this.config.verboseLogging) {
      console.error("=== AI Consultant Response ===");
      console.error(`Model: ${result.model}`);
      console.error(`Prompt: ${args.prompt.substring(0, 200)}${args.prompt.length > 200 ? "..." : ""}`);
      console.error(`Response length: ${result.response.length} characters`);
      console.error(`Response preview: ${result.response.substring(0, 200)}${result.response.length > 200 ? "..." : ""}`);
      console.error(`Tokens Used: ${JSON.stringify(result.usage, null, 2)}`);
      console.error(`Conversation ID: ${args.conversation_id || "N/A"}`);
      console.error(`Cached: ${result.model.includes("(cached)")}`);
      console.error(`Duration: ${duration}ms`);
      console.error("==============================");
    }

    // Format response
    const response: ConsultResponse = {
      model_used: result.model,
      response: result.response,
      tokens_used: result.usage,
      conversation_id: args.conversation_id || null,
      cached: result.model.includes("(cached)"),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
}

