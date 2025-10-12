/**
 * Rate limiter implementation
 * Enforces request limits per identifier (user, IP, conversation, etc.)
 */

import type { IRateLimiter, RateLimitEntry } from "../types/index.js";
import { RateLimitError } from "../types/index.js";

export class RateLimiter implements IRateLimiter {
  private limitMap: Map<string, RateLimitEntry>;
  private readonly requestsPerMinute: number;
  private readonly windowMs: number;

  constructor(requestsPerMinute: number = 20) {
    this.limitMap = new Map();
    this.requestsPerMinute = requestsPerMinute;
    this.windowMs = 60000; // 1 minute
  }

  /**
   * Check if request is within rate limit
   * Throws RateLimitError if limit exceeded
   */
  public checkLimit(identifier: string = "global"): void {
    const now = Date.now();
    const entry = this.limitMap.get(identifier);

    // Reset or create new entry if expired or doesn't exist
    if (!entry || now > entry.resetTime) {
      this.limitMap.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return;
    }

    // Check if limit exceeded
    if (entry.count >= this.requestsPerMinute) {
      const waitTimeMs = entry.resetTime - now;
      const waitTimeSeconds = Math.ceil(waitTimeMs / 1000);
      throw new RateLimitError(
        `Rate limit exceeded. Please wait ${waitTimeSeconds} seconds before making another request.`,
        waitTimeSeconds,
      );
    }

    // Increment counter
    entry.count++;
    this.limitMap.set(identifier, entry);
  }

  /**
   * Reset rate limit for a specific identifier
   */
  public reset(identifier: string): void {
    this.limitMap.delete(identifier);
  }

  /**
   * Reset all rate limits
   */
  public resetAll(): void {
    this.limitMap.clear();
  }

  /**
   * Get current count for an identifier
   */
  public getCount(identifier: string): number {
    const entry = this.limitMap.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    return entry.count;
  }

  /**
   * Get remaining requests for an identifier
   */
  public getRemaining(identifier: string): number {
    const count = this.getCount(identifier);
    return Math.max(0, this.requestsPerMinute - count);
  }
}

