/**
 * Conversation history management
 * Stores and manages conversation threads with automatic pruning
 */

import type { IHistoryManager, OpenRouterMessage } from "../types/index.js";

export class HistoryManager implements IHistoryManager {
  private histories: Map<string, OpenRouterMessage[]>;
  private readonly maxHistoryLength: number;

  constructor(maxHistoryLength: number = 20) {
    this.histories = new Map();
    this.maxHistoryLength = maxHistoryLength;
  }

  /**
   * Get conversation history for a given conversation ID
   */
  public getHistory(conversationId: string): OpenRouterMessage[] {
    if (!this.histories.has(conversationId)) {
      this.histories.set(conversationId, []);
    }
    return this.histories.get(conversationId)!;
  }

  /**
   * Update conversation history with new messages
   * Automatically prunes old messages if exceeding max length
   */
  public updateHistory(
    conversationId: string,
    userMessage: OpenRouterMessage,
    assistantMessage: OpenRouterMessage,
  ): void {
    const history = this.getHistory(conversationId);
    history.push(userMessage, assistantMessage);

    // Prune old messages if exceeding max length
    if (history.length > this.maxHistoryLength) {
      const excess = history.length - this.maxHistoryLength;
      history.splice(0, excess);
    }

    this.histories.set(conversationId, history);
  }

  /**
   * Clear conversation history for a given conversation ID
   */
  public clearHistory(conversationId: string): void {
    this.histories.delete(conversationId);
  }

  /**
   * Check if conversation history exists
   */
  public hasHistory(conversationId: string): boolean {
    return this.histories.has(conversationId) && this.histories.get(conversationId)!.length > 0;
  }

  /**
   * Get all conversation IDs
   */
  public getAllConversationIds(): string[] {
    return Array.from(this.histories.keys());
  }

  /**
   * Get total number of conversations
   */
  public getConversationCount(): number {
    return this.histories.size;
  }

  /**
   * Clear all conversation histories
   */
  public clearAll(): void {
    this.histories.clear();
  }
}

