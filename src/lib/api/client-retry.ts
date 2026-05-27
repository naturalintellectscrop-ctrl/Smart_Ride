// ============================================
// SMART RIDE - CLIENT-SIDE FETCH WITH RETRY
// ============================================
// Production-grade HTTP client with:
// - Exponential backoff retry (3 attempts by default)
// - Configurable delays
// - Network failure detection
// - AbortController support
// ============================================

/**
 * Options for fetchWithRetry
 */
export interface FetchWithRetryOptions extends RequestInit {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Maximum delay cap in ms (default: 10000) */
  maxDelay?: number;
  /** Callback fired on each retry attempt */
  onRetry?: (attempt: number, maxRetries: number, error: Error) => void;
}

/**
 * Result of a fetchWithRetry call
 */
export interface FetchWithRetryResult<T = unknown> {
  /** The parsed response data (if JSON) */
  data: T | null;
  /** The raw Response object */
  response: Response;
  /** Whether the request succeeded (status 2xx) */
  ok: boolean;
  /** Number of retry attempts made */
  attempts: number;
  /** Final error if all retries failed */
  error: Error | null;
}

/**
 * Check if an error is a network/timeout error that warrants a retry
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // TypeError from fetch typically means network failure
    // e.g., "Failed to fetch", "NetworkError", "Load failed"
    return true;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    // Don't retry aborted requests
    return false;
  }
  // Retry on generic errors that might be transient
  return error instanceof Error;
}

/**
 * Check if an HTTP status code warrants a retry
 */
function isRetryableStatus(status: number): boolean {
  // Retry on server errors and specific client errors
  // 408: Request Timeout
  // 429: Too Many Requests
  // 500-599: Server errors
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for a given retry attempt with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  backoffMultiplier: number,
  maxDelay: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
  // Add small jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Fetch with automatic retry on network failures and server errors.
 *
 * - Retries up to `maxRetries` times with exponential backoff
 * - Only retries on network errors and 5xx/408/429 status codes
 * - Does NOT retry on 4xx client errors (except 408, 429)
 * - Supports AbortController via the `signal` option
 * - Returns a FetchWithRetryResult with the response and metadata
 *
 * @example
 * ```ts
 * const result = await fetchWithRetry('/api/tasks?XTransformPort=3000', {
 *   headers: { 'Authorization': `Bearer ${token}` },
 *   maxRetries: 3,
 *   onRetry: (attempt, max, err) => console.log(`Retry ${attempt}/${max}:`, err.message),
 * });
 *
 * if (result.ok) {
 *   const tasks = result.data;
 * } else {
 *   console.error('All retries failed:', result.error);
 * }
 * ```
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<FetchWithRetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 10000,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts = attempt + 1;

    try {
      const response = await fetch(url, fetchOptions);
      lastResponse = response;

      // If the response is OK, return immediately
      if (response.ok) {
        let data: T | null = null;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json() as T;
          }
        } catch {
          // JSON parse failed, data stays null
        }

        return {
          data,
          response,
          ok: true,
          attempts,
          error: null,
        };
      }

      // If the status is retryable and we have retries left, retry
      if (isRetryableStatus(response.status) && attempt < maxRetries) {
        const delay = calculateDelay(attempt, initialDelay, backoffMultiplier, maxDelay);
        const retryError = new Error(`HTTP ${response.status}: ${response.statusText}`);

        onRetry?.(attempt + 1, maxRetries, retryError);

        await sleep(delay);
        continue;
      }

      // Non-retryable status or out of retries — return the error response
      let data: T | null = null;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json() as T;
        }
      } catch {
        // JSON parse failed
      }

      return {
        data,
        response,
        ok: false,
        attempts,
        error: new Error(`HTTP ${response.status}: ${response.statusText}`),
      };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      lastResponse = null;

      // Check if this was an abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          data: null,
          response: null as unknown as Response,
          ok: false,
          attempts,
          error: lastError,
        };
      }

      // If we have retries left and the error is retryable, retry
      if (isRetryableError(error) && attempt < maxRetries) {
        const delay = calculateDelay(attempt, initialDelay, backoffMultiplier, maxDelay);

        onRetry?.(attempt + 1, maxRetries, lastError);

        await sleep(delay);
        continue;
      }
    }
  }

  // All retries exhausted
  return {
    data: null,
    response: lastResponse as Response,
    ok: false,
    attempts,
    error: lastError || new Error('All retry attempts exhausted'),
  };
}

/**
 * Simplified fetchWithRetry that throws on failure.
 * Useful for cases where you just want the data or an error.
 *
 * @throws Error if all retries fail or response is not ok
 */
export async function fetchWithRetryOrFail<T = unknown>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const result = await fetchWithRetry<T>(url, options);

  if (!result.ok) {
    throw result.error || new Error(`Request failed after ${result.attempts} attempts`);
  }

  return result.data as T;
}

export default fetchWithRetry;
