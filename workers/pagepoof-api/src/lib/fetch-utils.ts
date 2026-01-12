/**
 * Fetch Utilities
 * Timeout handling and retry logic for API calls
 */

export interface FetchWithRetryOptions {
  timeout?: number;        // Request timeout in ms (default: 30000)
  maxRetries?: number;     // Max retry attempts (default: 3)
  retryDelay?: number;     // Base delay between retries in ms (default: 1000)
  retryOn?: number[];      // HTTP status codes to retry on (default: [429, 500, 502, 503, 504])
  onRetry?: (attempt: number, error: Error | Response) => void;
}

const DEFAULT_OPTIONS: Required<Omit<FetchWithRetryOptions, 'onRetry'>> = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  retryOn: [429, 500, 502, 503, 504],
};

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry and timeout
 * Implements exponential backoff with jitter
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_OPTIONS.timeout,
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    retryDelay = DEFAULT_OPTIONS.retryDelay,
    retryOn = DEFAULT_OPTIONS.retryOn,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, timeout);

      // Check if we should retry based on status code
      if (retryOn.includes(response.status) && attempt < maxRetries) {
        // Get retry-after header if available
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : calculateBackoff(attempt, retryDelay);

        onRetry?.(attempt + 1, response);
        await sleep(waitTime);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort (timeout) if it's the last attempt
      if (attempt >= maxRetries) {
        throw new Error(`Request failed after ${maxRetries + 1} attempts: ${lastError.message}`);
      }

      // Check if it's a retryable error (network error, timeout)
      if (isRetryableError(error)) {
        onRetry?.(attempt + 1, lastError);
        await sleep(calculateBackoff(attempt, retryDelay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Request failed');
}

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(attempt: number, baseDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter: random value between 0 and half the delay
  const jitter = Math.random() * exponentialDelay * 0.5;
  // Cap at 30 seconds
  return Math.min(exponentialDelay + jitter, 30000);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Retry on network errors, timeouts, and connection issues
    return (
      message.includes('abort') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('socket')
    );
  }
  return false;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a fetch function with default retry options for a specific API
 */
export function createRetryableFetch(defaultOptions: FetchWithRetryOptions = {}) {
  return (url: string, init: RequestInit, options: FetchWithRetryOptions = {}) =>
    fetchWithRetry(url, init, { ...defaultOptions, ...options });
}

/**
 * Pre-configured fetch for Anthropic API
 */
export const fetchAnthropic = createRetryableFetch({
  timeout: 60000,  // Claude can take longer for complex generations
  maxRetries: 2,
  retryDelay: 2000,
  retryOn: [429, 500, 502, 503, 529], // 529 is Anthropic overloaded
});

/**
 * Pre-configured fetch for Google AI API
 */
export const fetchGoogle = createRetryableFetch({
  timeout: 30000,
  maxRetries: 2,
  retryDelay: 1000,
  retryOn: [429, 500, 502, 503],
});

/**
 * Pre-configured fetch for OpenAI API
 */
export const fetchOpenAI = createRetryableFetch({
  timeout: 45000,
  maxRetries: 2,
  retryDelay: 1500,
  retryOn: [429, 500, 502, 503],
});

/**
 * Pre-configured fetch for Vertex AI (Imagen)
 */
export const fetchVertex = createRetryableFetch({
  timeout: 120000, // Image generation can take longer
  maxRetries: 1,   // Don't retry too much for expensive operations
  retryDelay: 3000,
  retryOn: [429, 500, 503],
});
