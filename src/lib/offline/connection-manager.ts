// ============================================
// SMART RIDE - CONNECTION MANAGER
// ============================================
// Monitors connection quality and adapts
// behavior for Uganda's weak internet
// ============================================

// ============================================
// TYPES
// ============================================

export type ConnectionQuality = 'EXCELLENT' | 'GOOD' | 'POOR' | 'OFFLINE';
export type DataMode = 'FULL' | 'REDUCED' | 'MINIMAL' | 'OFFLINE';

export interface ConnectionInfo {
  quality: ConnectionQuality;
  mode: DataMode;
  effectiveType: string;
  downlink: number;
  rtt: number;
  isOnline: boolean;
  lastChecked: Date;
}

export interface NetworkStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  lastOfflineAt?: Date;
  lastOnlineAt?: Date;
  consecutiveFailures: number;
}

// ============================================
// CONNECTION STATE
// ============================================

let currentQuality: ConnectionQuality = 'GOOD';
let currentMode: DataMode = 'FULL';
let lastChecked = new Date();
let networkStats: NetworkStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageLatency: 0,
  consecutiveFailures: 0,
};

// Latency samples for moving average
const latencySamples: number[] = [];
const MAX_SAMPLES = 10;

// Exponential backoff delays (in ms)
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000];

// ============================================
// CONNECTION MANAGER
// ============================================

export class ConnectionManager {
  // ============================================
  // CONNECTION DETECTION
  // ============================================

  /**
   * Get current connection quality
   */
  static getConnectionQuality(): ConnectionQuality {
    return currentQuality;
  }

  /**
   * Get recommended data mode based on connection
   */
  static getRecommendedMode(): DataMode {
    return currentMode;
  }

  /**
   * Get full connection info
   */
  static getConnectionInfo(): ConnectionInfo {
    return {
      quality: currentQuality,
      mode: currentMode,
      effectiveType: this.getEffectiveType(),
      downlink: this.getDownlinkSpeed(),
      rtt: this.getRTT(),
      isOnline: currentQuality !== 'OFFLINE',
      lastChecked,
    };
  }

  /**
   * Check if currently online
   */
  static isOnline(): boolean {
    return currentQuality !== 'OFFLINE';
  }

  /**
   * Check if should use low bandwidth mode
   */
  static shouldUseLowBandwidth(): boolean {
    return currentQuality === 'POOR' || currentMode === 'REDUCED' || currentMode === 'MINIMAL';
  }

  // ============================================
  // RETRY LOGIC
  // ============================================

  /**
   * Should retry a failed request?
   */
  static shouldRetry(error: any, attemptCount: number): boolean {
    // Don't retry more than max attempts
    if (attemptCount >= BACKOFF_DELAYS.length) {
      return false;
    }

    // Don't retry client errors (4xx)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }

    // Don't retry if explicitly cancelled
    if (error.name === 'AbortError') {
      return false;
    }

    // Retry for network errors and 5xx errors
    return this.isNetworkError(error) || error.status >= 500;
  }

  /**
   * Get retry delay using exponential backoff
   */
  static getRetryDelay(attemptCount: number): number {
    const index = Math.min(attemptCount, BACKOFF_DELAYS.length - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 500;
    
    return BACKOFF_DELAYS[index] + jitter;
  }

  /**
   * Execute with automatic retry
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      onRetry?: (attempt: number, error: any) => void;
    } = {}
  ): Promise<T> {
    const { maxAttempts = 3, onRetry } = options;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        this.recordSuccess();
        return result;
      } catch (error: any) {
        lastError = error;
        this.recordFailure();

        if (attempt < maxAttempts && this.shouldRetry(error, attempt)) {
          onRetry?.(attempt, error);
          await this.sleep(this.getRetryDelay(attempt));
        }
      }
    }

    throw lastError;
  }

  // ============================================
  // CONNECTION MONITORING
  // ============================================

  /**
   * Update connection quality based on request performance
   */
  static updateQuality(latencyMs: number, success: boolean): void {
    // Add latency sample
    latencySamples.push(latencyMs);
    if (latencySamples.length > MAX_SAMPLES) {
      latencySamples.shift();
    }

    // Calculate moving average
    const avgLatency = latencySamples.reduce((a, b) => a + b, 0) / latencySamples.length;

    // Determine quality based on latency
    if (!success) {
      networkStats.consecutiveFailures++;
      if (networkStats.consecutiveFailures >= 3) {
        currentQuality = 'OFFLINE';
        currentMode = 'OFFLINE';
        networkStats.lastOfflineAt = new Date();
      } else {
        currentQuality = 'POOR';
        currentMode = 'MINIMAL';
      }
    } else {
      networkStats.consecutiveFailures = 0;
      networkStats.lastOnlineAt = new Date();

      if (avgLatency < 200) {
        currentQuality = 'EXCELLENT';
        currentMode = 'FULL';
      } else if (avgLatency < 500) {
        currentQuality = 'GOOD';
        currentMode = 'FULL';
      } else if (avgLatency < 2000) {
        currentQuality = 'POOR';
        currentMode = 'REDUCED';
      } else {
        currentQuality = 'POOR';
        currentMode = 'MINIMAL';
      }
    }

    lastChecked = new Date();
  }

  /**
   * Record successful request
   */
  static recordSuccess(): void {
    networkStats.totalRequests++;
    networkStats.successfulRequests++;
    networkStats.consecutiveFailures = 0;
  }

  /**
   * Record failed request
   */
  static recordFailure(): void {
    networkStats.totalRequests++;
    networkStats.failedRequests++;
    networkStats.consecutiveFailures++;
  }

  /**
   * Record latency
   */
  static recordLatency(latencyMs: number): void {
    latencySamples.push(latencyMs);
    if (latencySamples.length > MAX_SAMPLES) {
      latencySamples.shift();
    }
    networkStats.averageLatency = latencySamples.reduce((a, b) => a + b, 0) / latencySamples.length;
  }

  /**
   * Get network statistics
   */
  static getNetworkStats(): NetworkStats {
    return { ...networkStats };
  }

  // ============================================
  // BANDWIDTH OPTIMIZATION
  // ============================================

  /**
   * Get optimal batch size based on connection
   */
  static getOptimalBatchSize(): number {
    switch (currentMode) {
      case 'FULL':
        return 50;
      case 'REDUCED':
        return 20;
      case 'MINIMAL':
        return 5;
      case 'OFFLINE':
        return 0;
      default:
        return 20;
    }
  }

  /**
   * Get optimal request timeout
   */
  static getOptimalTimeout(): number {
    switch (currentQuality) {
      case 'EXCELLENT':
        return 10000; // 10 seconds
      case 'GOOD':
        return 20000; // 20 seconds
      case 'POOR':
        return 60000; // 60 seconds
      case 'OFFLINE':
        return 5000; // 5 seconds (fail fast)
      default:
        return 20000;
    }
  }

  /**
   * Should compress requests?
   */
  static shouldCompress(): boolean {
    return currentMode !== 'FULL';
  }

  /**
   * Should prefetch data?
   */
  static shouldPrefetch(): boolean {
    return currentQuality === 'EXCELLENT' || currentQuality === 'GOOD';
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private static isNetworkError(error: any): boolean {
    return (
      error.name === 'TypeError' ||
      error.message?.toLowerCase().includes('network') ||
      error.message?.toLowerCase().includes('fetch') ||
      error.message?.toLowerCase().includes('timeout') ||
      error.message?.toLowerCase().includes('connection')
    );
  }

  private static getEffectiveType(): string {
    // Simulated network type based on quality
    switch (currentQuality) {
      case 'EXCELLENT':
        return '4g';
      case 'GOOD':
        return '3g';
      case 'POOR':
        return '2g';
      case 'OFFLINE':
        return 'offline';
      default:
        return '3g';
    }
  }

  private static getDownlinkSpeed(): number {
    // Estimated downlink speed in Mbps
    switch (currentQuality) {
      case 'EXCELLENT':
        return 10;
      case 'GOOD':
        return 3;
      case 'POOR':
        return 0.5;
      case 'OFFLINE':
        return 0;
      default:
        return 3;
    }
  }

  private static getRTT(): number {
    // Round trip time in ms
    return networkStats.averageLatency || 300;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ConnectionManager;
