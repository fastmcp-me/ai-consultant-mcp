/**
 * Circuit Breaker wrapper for the opossum library
 * Provides a clean interface for circuit breaker functionality
 */

import CircuitBreaker from "opossum";
import type {
  ICircuitBreaker,
  CircuitBreakerOptions,
} from "../types/index.js";
import { CircuitBreakerState } from "../types/index.js";

export class CircuitBreakerWrapper implements ICircuitBreaker {
  private breaker: CircuitBreaker;

  constructor(
    action: (...args: unknown[]) => Promise<unknown>,
    options: CircuitBreakerOptions,
  ) {
    this.breaker = new CircuitBreaker(action, {
      timeout: options.timeout,
      errorThresholdPercentage: options.errorThresholdPercentage,
      resetTimeout: options.resetTimeout,
    });

    this.setupEventListeners();
  }

  /**
   * Execute function through circuit breaker
   */
  public async fire<T>(...args: unknown[]): Promise<T> {
    return this.breaker.fire(...args) as Promise<T>;
  }

  /**
   * Get current circuit breaker state
   */
  public getState(): CircuitBreakerState {
    if (this.breaker.opened) {
      return CircuitBreakerState.OPEN;
    } else if (this.breaker.halfOpen) {
      return CircuitBreakerState.HALF_OPEN;
    } else {
      return CircuitBreakerState.CLOSED;
    }
  }

  /**
   * Setup event listeners for logging
   */
  private setupEventListeners(): void {
    this.breaker.on("open", () => {
      console.error(
        "Circuit breaker opened - too many failures detected. Requests will fail fast.",
      );
    });

    this.breaker.on("halfOpen", () => {
      console.warn(
        "Circuit breaker half-open - testing if service has recovered.",
      );
    });

    this.breaker.on("close", () => {
      console.log("Circuit breaker closed - service has recovered.");
    });

    this.breaker.on("fallback", () => {
      console.warn("Circuit breaker fallback triggered.");
    });
  }

  /**
   * Get circuit breaker statistics
   */
  public getStats() {
    return this.breaker.stats;
  }

  /**
   * Manually open the circuit
   */
  public open(): void {
    this.breaker.open();
  }

  /**
   * Manually close the circuit
   */
  public close(): void {
    this.breaker.close();
  }
}

