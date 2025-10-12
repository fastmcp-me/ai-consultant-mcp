/**
 * In-memory cache implementation with TTL support
 */

import NodeCache from "node-cache";
import type { ICache, CacheOptions } from "../types/index.js";

export class Cache<T> implements ICache<T> {
  private cache: NodeCache;

  constructor(options: CacheOptions) {
    this.cache = new NodeCache({
      stdTTL: options.ttl,
      checkperiod: options.checkPeriod || 60,
      useClones: false, // Better performance, but be careful with mutations
    });
  }

  /**
   * Get value from cache
   */
  public get(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  /**
   * Set value in cache
   */
  public set(key: string, value: T): void {
    this.cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete key from cache
   */
  public delete(key: string): void {
    this.cache.del(key);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  public getStats(): NodeCache.Stats {
    return this.cache.getStats();
  }
}

/**
 * Generate cache key for AI consultation
 */
export function generateCacheKey(prompt: string, model: string): string {
  // Use first 100 chars of prompt to keep key manageable
  const promptPrefix = prompt.substring(0, 100);
  return `${model}:${promptPrefix}`;
}

