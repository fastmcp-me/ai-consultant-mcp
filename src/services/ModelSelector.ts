/**
 * Model selection service
 * Implements strategy pattern for intelligent model selection based on task description
 */

import type {
  IModelSelector,
  ModelConfig,
  AvailableModels,
  ModelType,
} from "../types/index.js";

/**
 * Available AI models configuration
 */
const AVAILABLE_MODELS: AvailableModels = {
  "gemini-2.5-pro": {
    id: "google/gemini-2.5-pro",
    description: "Google's Gemini 2.5 Pro with large context window",
    bestFor: ["large context", "general purpose", "quick questions"],
  },
  "gpt-5-codex": {
    id: "openai/gpt-5-codex",
    description: "OpenAI's GPT-5 Codex, optimized for coding tasks",
    bestFor: ["coding", "complex tasks", "large context", "debugging", "refactoring"],
  },
  "grok-code-fast-1": {
    id: "x-ai/grok-code-fast-1",
    description: "xAI's Grok Code Fast 1, optimized for code-related tasks",
    bestFor: ["complex reasoning", "code review", "detailed analysis", "budget"],
  },
} as const;

export class ModelSelector implements IModelSelector {
  private readonly models: AvailableModels;

  constructor() {
    this.models = AVAILABLE_MODELS;
  }

  /**
   * Select best model based on task description
   * Uses keyword matching strategy
   */
  public selectModel(taskDescription: string): ModelConfig {
    const lowerDesc = taskDescription.toLowerCase();

    // Strategy 1: Coding-related keywords
    if (this.isCodingTask(lowerDesc)) {
      return this.models["gpt-5-codex"];
    }

    // Strategy 2: Complex analysis keywords
    if (this.isComplexAnalysisTask(lowerDesc)) {
      return this.models["grok-code-fast-1"];
    }

    // Strategy 3: Quick/simple questions or large context
    if (this.isQuickQuestionTask(lowerDesc)) {
      return this.models["gemini-2.5-pro"];
    }

    // Strategy 4: Budget-conscious
    if (this.isBudgetTask(lowerDesc)) {
      return this.models["grok-code-fast-1"];
    }

    // Default: GPT-5 Codex (good all-rounder for coding)
    return this.models["gpt-5-codex"];
  }

  /**
   * Get model by ID (short name like "gpt-5-codex")
   */
  public getModelById(modelId: string): ModelConfig | undefined {
    return this.models[modelId as ModelType];
  }

  /**
   * Get all available models
   */
  public getAllModels(): AvailableModels {
    return this.models;
  }

  /**
   * Check if task is coding-related
   */
  private isCodingTask(description: string): boolean {
    const codingKeywords = [
      "code",
      "coding",
      "typescript",
      "javascript",
      "python",
      "java",
      "refactor",
      "debug",
      "function",
      "class",
      "bug",
      "programming",
      "algorithm",
    ];

    return codingKeywords.some((keyword) => description.includes(keyword));
  }

  /**
   * Check if task requires complex analysis
   */
  private isComplexAnalysisTask(description: string): boolean {
    const complexKeywords = [
      "complex",
      "architecture",
      "system design",
      "detailed analysis",
      "in-depth",
      "comprehensive",
      "thorough",
    ];

    return complexKeywords.some((keyword) => description.includes(keyword));
  }

  /**
   * Check if task is a quick question
   */
  private isQuickQuestionTask(description: string): boolean {
    const quickKeywords = [
      "quick",
      "simple",
      "explain",
      "what is",
      "how to",
      "large context",
      "summary",
    ];

    return quickKeywords.some((keyword) => description.includes(keyword));
  }

  /**
   * Check if task is budget-conscious
   */
  private isBudgetTask(description: string): boolean {
    const budgetKeywords = ["budget", "cost-effective", "cheap", "affordable"];

    return budgetKeywords.some((keyword) => description.includes(keyword));
  }

  /**
   * Get model names as array
   */
  public getModelNames(): string[] {
    return Object.keys(this.models);
  }
}

