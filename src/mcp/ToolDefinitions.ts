/**
 * MCP Tool Definitions
 * Defines the tools available in the MCP server
 */

import type { ToolDefinition } from "../types/index.js";

/**
 * Get all tool definitions
 */
export function getToolDefinitions(modelNames: string[]): ToolDefinition[] {
  return [
    {
      name: "consult_ai",
      description:
        "Consult with an AI model via OpenRouter. You can either specify a model or let the system auto-select based on your task. For sequential multi-model consultation, use the 'models' parameter to specify multiple models.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The question or task to send to the AI model",
          },
          model: {
            type: "string",
            description: `Optional: Specific model to use (e.g., ${modelNames.map((m) => `'${m}'`).join(", ")}). If not specified, the best model will be automatically selected based on the task.`,
            enum: modelNames,
          },
          models: {
            type: "array",
            description: `Optional: Array of models to consult sequentially (e.g., ["gemini-2.5-pro", "gpt-5-codex"]). When specified, the prompt will be sent to each model in order and responses will be aggregated. This parameter takes precedence over 'model'.`,
            items: {
              type: "string",
              enum: modelNames,
            },
          },
          task_description: {
            type: "string",
            description:
              "Optional: Brief description of the task type to help auto-select the best model (e.g., 'coding task', 'complex analysis', 'quick question')",
          },
          conversation_id: {
            type: "string",
            description:
              "Optional: Conversation ID to maintain context across multiple consultations. Use the same ID for follow-up questions.",
          },
          clear_history: {
            type: "boolean",
            description:
              "Optional: Set to true to clear the conversation history for the given conversation_id before processing this request.",
          },
        },
        required: ["prompt"],
      },
    },
    {
      name: "list_models",
      description:
        "List all available AI models with their descriptions and best use cases",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

