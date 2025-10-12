/**
 * MCP Server
 * Main server implementation for Model Context Protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { ConsultationService } from "../services/ConsultationService.js";
import { ToolHandler } from "./handlers/ToolHandler.js";
import { getToolDefinitions } from "./ToolDefinitions.js";
import { Config } from "../config/Config.js";

export class MCPServer {
  private server: Server;
  private toolHandler: ToolHandler;
  private consultationService: ConsultationService;
  private config: Config;

  constructor(consultationService: ConsultationService) {
    this.config = Config.getInstance();
    this.consultationService = consultationService;
    this.toolHandler = new ToolHandler(consultationService);

    if (this.config.verboseLogging) {
      console.error("[MCP Server] Initializing MCP server");
    }

    this.server = new Server(
      {
        name: "ai-consultant",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();

    if (this.config.verboseLogging) {
      console.error("[MCP Server] MCP server initialized successfully");
    }
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    if (this.config.verboseLogging) {
      console.error("[MCP Server] Setting up request handlers");
    }

    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (this.config.verboseLogging) {
        console.error("[MCP Server] Received ListTools request");
      }

      const modelNames = this.consultationService.listModels().map((m) => m.name);
      const tools = getToolDefinitions(modelNames);

      if (this.config.verboseLogging) {
        console.error(`[MCP Server] Returning ${tools.length} tool definitions`);
      }

      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest) => {
        if (this.config.verboseLogging) {
          console.error("[MCP Server] Received CallTool request");
        }

        const result = await this.toolHandler.handleToolCall(request);
        return result as any; // MCP SDK type compatibility
      },
    );

    if (this.config.verboseLogging) {
      console.error("[MCP Server] Request handlers configured");
    }
  }

  /**
   * Start the MCP server
   */
  public async start(): Promise<void> {
    if (this.config.verboseLogging) {
      console.error("[MCP Server] Starting MCP server with stdio transport");
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error("AI Consultant MCP Server running on stdio");

    if (this.config.verboseLogging) {
      console.error("[MCP Server] Verbose logging is ENABLED");
      console.error("[MCP Server] All operations will be logged to stderr");
    }
  }

  /**
   * Get server instance (for testing)
   */
  public getServer(): Server {
    return this.server;
  }
}

