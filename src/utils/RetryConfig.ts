/**
 * Retry configuration for axios
 * Provides exponential backoff and retry logic
 */

import axios from "axios";
import axiosRetry from "axios-retry";

/**
 * Configure axios with retry logic
 */
export function configureAxiosRetry(retries: number = 3): void {
  axiosRetry(axios, {
    retries,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      // Retry on network errors or 5xx server errors
      return (
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.response?.status !== undefined && error.response.status >= 500)
      );
    },
  });
}

