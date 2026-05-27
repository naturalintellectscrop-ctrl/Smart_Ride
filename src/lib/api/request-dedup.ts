// ============================================
// SMART RIDE - REQUEST DEDUPLICATION
// ============================================
// In-memory deduplication map for preventing
// duplicate task transition requests within
// a short time window (5 seconds).
//
// Key: `taskId:toStatus`
// Value: { timestamp, pending: Promise }
//
// If a duplicate request is detected within the
// window, the existing result is returned instead
// of making a new API call.
// ============================================

/** Deduplication window in milliseconds */
const DEDUP_WINDOW_MS = 5000;

interface DedupEntry<T = unknown> {
  timestamp: number;
  promise: Promise<T>;
}

/**
 * In-memory request deduplication store.
 * Prevents the same transition from being submitted
 * within the dedup window (5 seconds by default).
 */
class RequestDeduplicator {
  private entries: Map<string, DedupEntry> = new Map();

  // Cleanup interval to prevent memory leaks
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Run cleanup every 30 seconds to remove expired entries
    if (typeof window !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), 30000);
    }
  }

  /**
   * Check if a request is a duplicate within the dedup window.
   * If a pending request exists for the same key, return its promise.
   * Otherwise, return null.
   */
  getExisting<T>(key: string): Promise<T> | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    const elapsed = Date.now() - entry.timestamp;
    if (elapsed > DEDUP_WINDOW_MS) {
      // Entry has expired, remove it
      this.entries.delete(key);
      return null;
    }

    // Return the existing promise so the caller can await it
    return entry.promise as Promise<T>;
  }

  /**
   * Register a pending request for deduplication.
   * Returns the same promise for all callers within the dedup window.
   */
  register<T>(key: string, promise: Promise<T>): Promise<T> {
    this.entries.set(key, {
      timestamp: Date.now(),
      promise,
    });

    // Clean up the entry when the promise resolves/rejects
    promise
      .then(() => {
        // Keep the entry for the dedup window even after success
        // (prevents rapid re-submission of the same transition)
      })
      .catch(() => {
        // On failure, remove the entry so it can be retried
        const entry = this.entries.get(key);
        if (entry && entry.promise === promise) {
          this.entries.delete(key);
        }
      });

    return promise;
  }

  /**
   * Check if a request key is currently deduplicated (within window).
   * Useful for UI to show "already submitting" state.
   */
  isDeduplicated(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;

    const elapsed = Date.now() - entry.timestamp;
    if (elapsed > DEDUP_WINDOW_MS) {
      this.entries.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove a specific entry (e.g., after confirming the request is done)
   */
  remove(key: string): void {
    this.entries.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Remove expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries.entries()) {
      if (now - entry.timestamp > DEDUP_WINDOW_MS) {
        this.entries.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup timer (call on unmount/shutdown)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.entries.clear();
  }
}

/**
 * Build a deduplication key for task transitions.
 * Format: `taskId:toStatus`
 */
export function buildTransitionDedupKey(taskId: string, toStatus: string): string {
  return `${taskId}:${toStatus}`;
}

/**
 * Singleton deduplicator instance for task transition requests.
 * Used by rider components to prevent duplicate status update submissions.
 */
export const transitionDeduplicator = new RequestDeduplicator();

/**
 * General-purpose deduplicator for any API requests.
 */
export const apiDeduplicator = new RequestDeduplicator();

export default RequestDeduplicator;
