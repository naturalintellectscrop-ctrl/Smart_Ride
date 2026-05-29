/**
 * Retry System Service
 *
 * Provides robust retry mechanisms for the Smart Ride platform:
 *
 * - Generic retry with exponential backoff
 * - Retry for failed notification delivery
 * - Retry for failed socket emissions
 * - Retry for failed dispatch attempts
 * - Scheduled retry jobs stored in SystemConfig
 *
 * All retry operations include proper tracking and audit logging.
 */

import { db } from '@/lib/db';
import { EventBusService } from '@/lib/events/event-bus.service';

// ============================================
// Types
// ============================================

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;   // ms
  maxDelay: number;       // ms
  backoffFactor: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};

export interface RetryJob {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  scheduledAt: Date;
  attempts: number;
  maxRetries: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  lastError?: string;
  createdAt: Date;
}

// ============================================
// Retry System Service
// ============================================

export class RetrySystemService {
  // --------------------------------------------
  // 1. Generic Retry with Exponential Backoff
  // --------------------------------------------

  /**
   * Execute a function with exponential backoff retry.
   * Returns result or throws the last error after all retries are exhausted.
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {},
  ): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < opts.maxRetries) {
          const delayMs = Math.min(
            opts.initialDelay * Math.pow(opts.backoffFactor, attempt),
            opts.maxDelay,
          );

          console.log(
            `[RetrySystem] Attempt ${attempt + 1}/${opts.maxRetries} failed, ` +
            `retrying in ${delayMs}ms: ${lastError.message}`,
          );

          await this.sleep(delayMs);
        }
      }
    }

    throw lastError || new Error('Retry failed with unknown error');
  }

  // --------------------------------------------
  // 2. Retry Notification Delivery
  // --------------------------------------------

  /**
   * Retry a failed notification delivery.
   * Tracks retry count in NotificationLog.
   */
  static async retryNotification(
    notificationFn: (userId: string, data: Record<string, unknown>) => Promise<boolean>,
    userId: string,
    data: Record<string, unknown>,
    maxRetries: number = 3,
  ): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    let attempts = 0;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      attempts++;
      try {
        const result = await notificationFn(userId, data);
        if (result) {
          // Update notification log retry count if a log entry exists
          try {
            const recentLog = await db.notificationLog.findFirst({
              where: {
                userId,
                status: 'FAILED',
                type: 'PUSH',
              },
              orderBy: { createdAt: 'desc' },
            });

            if (recentLog) {
              await db.notificationLog.update({
                where: { id: recentLog.id },
                data: {
                  retryCount: attempt,
                  status: 'SENT',
                  sentAt: new Date(),
                },
              });
            }
          } catch {
            // Non-critical — don't fail the retry for this
          }

          return { success: true, attempts };
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (attempt < maxRetries) {
          const delayMs = Math.min(
            DEFAULT_RETRY_OPTIONS.initialDelay * Math.pow(DEFAULT_RETRY_OPTIONS.backoffFactor, attempt),
            DEFAULT_RETRY_OPTIONS.maxDelay,
          );
          await this.sleep(delayMs);
        }
      }
    }

    // Mark as failed in log
    try {
      const recentLog = await db.notificationLog.findFirst({
        where: {
          userId,
          status: { in: ['PENDING', 'FAILED'] },
          type: 'PUSH',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentLog) {
        await db.notificationLog.update({
          where: { id: recentLog.id },
          data: {
            retryCount: maxRetries,
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: lastError || 'Max retries exceeded',
          },
        });
      }
    } catch {
      // Non-critical
    }

    return { success: false, attempts, lastError };
  }

  // --------------------------------------------
  // 3. Retry Socket Emission
  // --------------------------------------------

  /**
   * Retry a failed socket emission.
   * Uses EventBusService.emitWithRetry under the hood.
   */
  static async retrySocketEmission(
    emitFn: (event: string, data: Record<string, unknown>) => Promise<boolean>,
    event: string,
    data: Record<string, unknown>,
    maxRetries: number = 3,
  ): Promise<{ success: boolean; attempts: number }> {
    let attempts = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      attempts++;
      try {
        const result = await emitFn(event, data);
        if (result) {
          return { success: true, attempts };
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[RetrySystem] Socket emission attempt ${attempt + 1} failed for event ${event}: ${errMsg}`);
      }

      if (attempt < maxRetries) {
        const delayMs = Math.min(
          DEFAULT_RETRY_OPTIONS.initialDelay * Math.pow(DEFAULT_RETRY_OPTIONS.backoffFactor, attempt),
          DEFAULT_RETRY_OPTIONS.maxDelay,
        );
        await this.sleep(delayMs);
      }
    }

    // Last resort: use EventBusService.emitWithRetry
    try {
      const result = await EventBusService.emitWithRetry(
        {
          type: 'NOTIFICATION',
          userId: data.userId as string || 'system',
          title: event,
          message: JSON.stringify(data),
          notificationType: 'SYSTEM',
          metadata: data,
        },
        maxRetries,
      );

      return { success: result.success, attempts };
    } catch {
      return { success: false, attempts };
    }
  }

  // --------------------------------------------
  // 4. Retry Dispatch
  // --------------------------------------------

  /**
   * Retry a failed dispatch attempt.
   * Calls the dispatch API endpoint to re-trigger matching.
   */
  static async retryDispatch(
    taskId: string,
    maxRetries: number = 3,
  ): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    let attempts = 0;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      attempts++;
      try {
        // Check if task is still in a dispatchable state
        const task = await db.task.findUnique({
          where: { id: taskId },
          select: { status: true, taskType: true },
        });

        if (!task) {
          return { success: false, attempts, lastError: 'Task not found' };
        }

        if (!['SEARCHING', 'MATCHING', 'CREATED', 'REQUESTED'].includes(task.status)) {
          return { success: false, attempts, lastError: `Task is in ${task.status} state, cannot retry dispatch` };
        }

        // Attempt to dispatch via internal API
        const dispatchResult = await fetch(`/api/dispatch/match?XTransformPort=3000`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': process.env.INTERNAL_API_KEY || 'smart-ride-internal-api-key-2024',
          },
          body: JSON.stringify({ taskId }),
        });

        if (dispatchResult.ok) {
          return { success: true, attempts };
        }

        const errorBody = await dispatchResult.text();
        lastError = `Dispatch API returned ${dispatchResult.status}: ${errorBody}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      if (attempt < maxRetries) {
        const delayMs = Math.min(
          DEFAULT_RETRY_OPTIONS.initialDelay * Math.pow(DEFAULT_RETRY_OPTIONS.backoffFactor, attempt),
          DEFAULT_RETRY_OPTIONS.maxDelay,
        );
        await this.sleep(delayMs);
      }
    }

    return { success: false, attempts, lastError };
  }

  // --------------------------------------------
  // 5. Create Retry Job
  // --------------------------------------------

  /**
   * Create a scheduled retry job stored in SystemConfig.
   * Jobs are stored as JSON with key pattern: retry:{type}:{id}
   */
  static async createRetryJob(
    type: string,
    payload: Record<string, unknown>,
    scheduledAt?: Date,
  ): Promise<RetryJob> {
    const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const key = `retry:${type}:${jobId}`;

    const job: RetryJob = {
      id: jobId,
      type,
      payload,
      scheduledAt: scheduledAt || new Date(),
      attempts: 0,
      maxRetries: DEFAULT_RETRY_OPTIONS.maxRetries,
      status: 'PENDING',
      createdAt: new Date(),
    };

    await db.systemConfig.create({
      data: {
        key,
        value: JSON.stringify(job),
        description: `Retry job: ${type}`,
      },
    });

    return job;
  }

  /**
   * Get all pending retry jobs from SystemConfig.
   */
  static async getPendingRetryJobs(): Promise<RetryJob[]> {
    const configs = await db.systemConfig.findMany({
      where: {
        key: { startsWith: 'retry:' },
      },
    });

    const jobs: RetryJob[] = [];
    for (const config of configs) {
      try {
        const job = JSON.parse(config.value) as RetryJob;
        if (job.status === 'PENDING' && new Date(job.scheduledAt) <= new Date()) {
          jobs.push(job);
        }
      } catch {
        // Skip malformed entries
      }
    }

    return jobs.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  /**
   * Update a retry job's status in SystemConfig.
   */
  static async updateRetryJob(
    jobId: string,
    type: string,
    updates: Partial<RetryJob>,
  ): Promise<void> {
    const key = `retry:${type}:${jobId}`;
    const config = await db.systemConfig.findUnique({ where: { key } });

    if (!config) return;

    const existingJob = JSON.parse(config.value) as RetryJob;
    const updatedJob = { ...existingJob, ...updates };

    await db.systemConfig.update({
      where: { key },
      data: { value: JSON.stringify(updatedJob) },
    });
  }

  /**
   * Remove a completed/failed retry job from SystemConfig.
   */
  static async removeRetryJob(jobId: string, type: string): Promise<void> {
    const key = `retry:${type}:${jobId}`;
    try {
      await db.systemConfig.delete({ where: { key } });
    } catch {
      // Already removed
    }
  }

  /**
   * Process all pending retry jobs.
   * Should be called periodically (e.g., via cron or recovery service).
   */
  static async processPendingRetryJobs(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const jobs = await this.getPendingRetryJobs();
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        await this.updateRetryJob(job.id, job.type, {
          status: 'IN_PROGRESS',
          attempts: job.attempts + 1,
        });

        // Execute the retry based on job type
        const result = await this.executeRetryJob(job);

        if (result) {
          await this.updateRetryJob(job.id, job.type, { status: 'COMPLETED' });
          succeeded++;

          // Clean up completed job after a delay
          setTimeout(() => {
            this.removeRetryJob(job.id, job.type).catch(() => {});
          }, 5 * 60 * 1000);
        } else {
          if (job.attempts + 1 >= job.maxRetries) {
            await this.updateRetryJob(job.id, job.type, { status: 'FAILED' });
            failed++;
          } else {
            // Reschedule with exponential backoff
            const nextScheduledAt = new Date(
              Date.now() + Math.min(
                DEFAULT_RETRY_OPTIONS.initialDelay * Math.pow(DEFAULT_RETRY_OPTIONS.backoffFactor, job.attempts),
                DEFAULT_RETRY_OPTIONS.maxDelay,
              ),
            );
            await this.updateRetryJob(job.id, job.type, {
              status: 'PENDING',
              scheduledAt: nextScheduledAt,
            });
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        await this.updateRetryJob(job.id, job.type, {
          status: job.attempts + 1 >= job.maxRetries ? 'FAILED' : 'PENDING',
          lastError: errMsg,
        });
        failed++;
      }
    }

    return { processed: jobs.length, succeeded, failed };
  }

  /**
   * Execute a single retry job based on its type.
   */
  private static async executeRetryJob(job: RetryJob): Promise<boolean> {
    switch (job.type) {
      case 'DISPATCH': {
        const result = await this.retryDispatch(job.payload.taskId as string, 1);
        return result.success;
      }
      case 'NOTIFICATION': {
        // For notification retries, we just re-create and send
        try {
          await db.notification.create({
            data: {
              userId: job.payload.userId as string,
              title: job.payload.title as string,
              message: job.payload.message as string,
              type: (job.payload.notificationType as any) || 'SYSTEM',
              referenceId: job.payload.referenceId as string,
              referenceType: job.payload.referenceType as string,
            },
          });
          return true;
        } catch {
          return false;
        }
      }
      case 'SOCKET_EMISSION': {
        try {
          const result = await EventBusService.emitWithRetry(
            {
              type: (job.payload.eventType as any) || 'NOTIFICATION',
              userId: job.payload.userId as string || 'system',
              title: job.payload.event as string || 'retry',
              message: JSON.stringify(job.payload.data || {}),
              notificationType: 'SYSTEM',
            },
            1,
          );
          return result.success;
        } catch {
          return false;
        }
      }
      default:
        console.warn(`[RetrySystem] Unknown retry job type: ${job.type}`);
        return false;
    }
  }

  // --------------------------------------------
  // Helpers
  // --------------------------------------------

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default RetrySystemService;
