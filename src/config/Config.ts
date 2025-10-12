/**
 * Application configuration management
 * Handles environment variables with validation and type safety
 */

export interface IConfig {
  readonly openRouterApiKey: string;
  readonly rateLimitPerMinute: number;
  readonly cacheTtlSeconds: number;
  readonly maxConversationHistory: number;
  readonly circuitBreakerTimeout: number;
  readonly circuitBreakerThreshold: number;
  readonly circuitBreakerResetTimeout: number;
  readonly retryAttempts: number;
  readonly verboseLogging: boolean;
}

export class Config implements IConfig {
  private static instance: Config | null = null;

  public readonly openRouterApiKey: string;
  public readonly rateLimitPerMinute: number;
  public readonly cacheTtlSeconds: number;
  public readonly maxConversationHistory: number;
  public readonly circuitBreakerTimeout: number;
  public readonly circuitBreakerThreshold: number;
  public readonly circuitBreakerResetTimeout: number;
  public readonly retryAttempts: number;
  public readonly verboseLogging: boolean;

  private constructor() {
    // Validate required environment variables
    this.openRouterApiKey = this.getRequiredEnv("OPENROUTER_API_KEY");

    // Optional environment variables with defaults
    this.rateLimitPerMinute = this.getNumberEnv("RATE_LIMIT_PER_MINUTE", 20);
    this.cacheTtlSeconds = this.getNumberEnv("CACHE_TTL_SECONDS", 300);
    this.maxConversationHistory = this.getNumberEnv(
      "MAX_CONVERSATION_HISTORY",
      20,
    );
    this.circuitBreakerTimeout = this.getNumberEnv(
      "CIRCUIT_BREAKER_TIMEOUT_MS",
      30000,
    );
    this.circuitBreakerThreshold = this.getNumberEnv(
      "CIRCUIT_BREAKER_THRESHOLD",
      0.5,
    );
    this.circuitBreakerResetTimeout = this.getNumberEnv(
      "CIRCUIT_BREAKER_RESET_MS",
      30000,
    );
    this.retryAttempts = this.getNumberEnv("RETRY_ATTEMPTS", 3);
    this.verboseLogging = this.getBooleanEnv("VERBOSE_LOGGING", false);

    this.validate();
  }

  /**
   * Get singleton instance of Config
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static reset(): void {
    Config.instance = null;
  }

  /**
   * Get required environment variable or throw error
   */
  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  /**
   * Get optional number environment variable with default
   */
  private getNumberEnv(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }

    const parsed = Number(value);
    if (isNaN(parsed)) {
      console.warn(
        `Invalid number for ${key}: ${value}. Using default: ${defaultValue}`,
      );
      return defaultValue;
    }

    return parsed;
  }

  /**
   * Get optional boolean environment variable with default
   */
  private getBooleanEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }

    const lowerValue = value.toLowerCase();
    if (lowerValue === "true" || lowerValue === "1") {
      return true;
    }
    if (lowerValue === "false" || lowerValue === "0") {
      return false;
    }

    console.warn(
      `Invalid boolean for ${key}: ${value}. Using default: ${defaultValue}`,
    );
    return defaultValue;
  }

  /**
   * Validate configuration values
   */
  private validate(): void {
    if (this.rateLimitPerMinute <= 0) {
      throw new Error("RATE_LIMIT_PER_MINUTE must be greater than 0");
    }

    if (this.cacheTtlSeconds < 0) {
      throw new Error("CACHE_TTL_SECONDS must be non-negative");
    }

    if (this.maxConversationHistory <= 0) {
      throw new Error("MAX_CONVERSATION_HISTORY must be greater than 0");
    }

    if (this.circuitBreakerThreshold < 0 || this.circuitBreakerThreshold > 1) {
      throw new Error("CIRCUIT_BREAKER_THRESHOLD must be between 0 and 1");
    }

    if (this.retryAttempts < 0) {
      throw new Error("RETRY_ATTEMPTS must be non-negative");
    }
  }
}
