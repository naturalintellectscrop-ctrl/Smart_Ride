// ============================================
// SMART RIDE - OFFLINE QUEUE SERVICE
// ============================================
// Queues API requests when offline for replay
// when connection is restored
// Optimized for Uganda's weak internet infrastructure
// ============================================

import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export type RequestPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  priority: RequestPriority;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  response?: any;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  oldestPending?: Date;
  nextRetry?: Date;
}

// ============================================
// IN-MEMORY QUEUE
// For production, consider using SQLite/IndexedDB
// ============================================

const requestQueue = new Map<string, QueuedRequest>();
const MAX_QUEUE_SIZE = 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

// Priority order for processing
const PRIORITY_ORDER: RequestPriority[] = ['HIGH', 'MEDIUM', 'LOW'];

// ============================================
// OFFLINE QUEUE SERVICE
// ============================================

export class OfflineQueue {
  /**
   * Add a request to the offline queue
   */
  static async enqueue(request: {
    url: string;
    method: string;
    body?: any;
    headers?: Record<string, string>;
    priority?: RequestPriority;
    maxAttempts?: number;
  }): Promise<string> {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedRequest: QueuedRequest = {
      id,
      url: request.url,
      method: request.method.toUpperCase(),
      body: request.body,
      headers: request.headers,
      priority: request.priority || 'MEDIUM',
      status: 'PENDING',
      attempts: 0,
      maxAttempts: request.maxAttempts || DEFAULT_MAX_ATTEMPTS,
      createdAt: new Date(),
    };

    // Check queue size limit
    if (requestQueue.size >= MAX_QUEUE_SIZE) {
      // Remove oldest LOW priority items first
      this.evictOldestLowPriority();
    }

    requestQueue.set(id, queuedRequest);
    
    // Persist to database for recovery
    await this.persistToStorage(queuedRequest);
    
    return id;
  }

  /**
   * Process all queued requests in priority order
   */
  static async processQueue(): Promise<{
    processed: number;
    failed: number;
    remaining: number;
  }> {
    let processed = 0;
    let failed = 0;

    // Get pending requests sorted by priority and creation time
    const pendingRequests = this.getPendingRequestsSorted();

    for (const request of pendingRequests) {
      // Skip if max attempts reached
      if (request.attempts >= request.maxAttempts) {
        request.status = 'FAILED';
        request.error = 'Max retry attempts reached';
        requestQueue.set(request.id, request);
        failed++;
        continue;
      }

      try {
        request.status = 'PROCESSING';
        request.attempts++;
        request.lastAttemptAt = new Date();
        requestQueue.set(request.id, request);

        // Execute the request
        const response = await this.executeRequest(request);
        
        if (response.ok) {
          request.status = 'COMPLETED';
          request.completedAt = new Date();
          request.response = await response.json().catch(() => null);
          processed++;
        } else {
          // Check if we should retry
          if (this.shouldRetry(response.status, request.attempts)) {
            request.status = 'PENDING';
          } else {
            request.status = 'FAILED';
            request.error = `HTTP ${response.status}`;
            failed++;
          }
        }
      } catch (error: any) {
        // Network error - keep in queue for retry
        if (this.isNetworkError(error)) {
          request.status = 'PENDING';
        } else {
          request.status = 'FAILED';
          request.error = error.message;
          failed++;
        }
      }

      requestQueue.set(request.id, request);
      await this.persistToStorage(request);
    }

    return {
      processed,
      failed,
      remaining: this.getPendingCount(),
    };
  }

  /**
   * Get queue statistics
   */
  static getQueueStatus(): QueueStats {
    const requests = Array.from(requestQueue.values());
    
    const pending = requests.filter(r => r.status === 'PENDING');
    const processing = requests.filter(r => r.status === 'PROCESSING');
    const completed = requests.filter(r => r.status === 'COMPLETED');
    const failed = requests.filter(r => r.status === 'FAILED');

    const oldestPending = pending.length > 0 
      ? pending.reduce((oldest, r) => r.createdAt < oldest.createdAt ? r : oldest).createdAt
      : undefined;

    return {
      pending: pending.length,
      processing: processing.length,
      completed: completed.length,
      failed: failed.length,
      oldestPending,
    };
  }

  /**
   * Get a specific queued request
   */
  static getRequest(id: string): QueuedRequest | undefined {
    return requestQueue.get(id);
  }

  /**
   * Remove a request from the queue
   */
  static async removeRequest(id: string): Promise<boolean> {
    const exists = requestQueue.has(id);
    if (exists) {
      requestQueue.delete(id);
    }
    return exists;
  }

  /**
   * Clear all completed and failed requests
   */
  static async clearCompleted(): Promise<number> {
    let cleared = 0;
    for (const [id, request] of requestQueue.entries()) {
      if (request.status === 'COMPLETED' || request.status === 'FAILED') {
        requestQueue.delete(id);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Retry all failed requests
   */
  static async retryFailed(): Promise<number> {
    let retried = 0;
    for (const [id, request] of requestQueue.entries()) {
      if (request.status === 'FAILED') {
        request.status = 'PENDING';
        request.attempts = 0;
        request.error = undefined;
        requestQueue.set(id, request);
        retried++;
      }
    }
    return retried;
  }

  /**
   * Get all pending requests
   */
  static getPendingRequests(): QueuedRequest[] {
    return Array.from(requestQueue.values())
      .filter(r => r.status === 'PENDING');
  }

  /**
   * Get pending request count
   */
  static getPendingCount(): number {
    return Array.from(requestQueue.values())
      .filter(r => r.status === 'PENDING').length;
  }

  /**
   * Load queue from persistent storage
   */
  static async loadFromStorage(): Promise<void> {
    try {
      const stored = await db.systemConfig.findUnique({
        where: { key: 'offline_queue' },
      });
      
      if (stored) {
        const requests = JSON.parse(stored.value) as QueuedRequest[];
        for (const request of requests) {
          if (request.status === 'PENDING' || request.status === 'PROCESSING') {
            request.status = 'PENDING'; // Reset processing to pending on load
            requestQueue.set(request.id, request);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private static getPendingRequestsSorted(): QueuedRequest[] {
    return Array.from(requestQueue.values())
      .filter(r => r.status === 'PENDING')
      .sort((a, b) => {
        // Sort by priority first
        const priorityDiff = PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
        if (priorityDiff !== 0) return priorityDiff;
        // Then by creation time
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  private static async executeRequest(request: QueuedRequest): Promise<Response> {
    const options: RequestInit = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
    };

    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      options.body = JSON.stringify(request.body);
    }

    return fetch(request.url, options);
  }

  private static shouldRetry(statusCode: number, attemptCount: number): boolean {
    // Don't retry client errors (4xx) except 408, 429
    if (statusCode >= 400 && statusCode < 500 && ![408, 429].includes(statusCode)) {
      return false;
    }
    
    // Retry server errors (5xx) up to max attempts
    return attemptCount < DEFAULT_MAX_ATTEMPTS;
  }

  private static isNetworkError(error: any): boolean {
    return (
      error.name === 'TypeError' ||
      error.message?.includes('network') ||
      error.message?.includes('fetch') ||
      error.message?.includes('timeout')
    );
  }

  private static evictOldestLowPriority(): void {
    const lowPriority = Array.from(requestQueue.entries())
      .filter(([_, r]) => r.priority === 'LOW' && r.status === 'PENDING')
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());

    if (lowPriority.length > 0) {
      requestQueue.delete(lowPriority[0][0]);
    }
  }

  private static async persistToStorage(request: QueuedRequest): Promise<void> {
    try {
      const requests = Array.from(requestQueue.values());
      await db.systemConfig.upsert({
        where: { key: 'offline_queue' },
        update: { value: JSON.stringify(requests) },
        create: { 
          key: 'offline_queue', 
          value: JSON.stringify([request]) 
        },
      });
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }
}

export default OfflineQueue;
