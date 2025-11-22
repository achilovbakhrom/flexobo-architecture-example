import { Logger } from '@nestjs/common';

/**
 * Bulkhead configuration
 */
export interface BulkheadConfig {
  /**
   * Maximum number of concurrent executions
   */
  maxConcurrent: number;

  /**
   * Maximum queue size for waiting requests
   * Default: 0 (no queue)
   */
  maxQueueSize?: number;

  /**
   * Timeout for queued requests (milliseconds)
   * Default: 30000 (30 seconds)
   */
  queueTimeout?: number;

  /**
   * Name for logging
   */
  name?: string;

  /**
   * Callback when bulkhead is full
   */
  onBulkheadFull?: () => void;
}

/**
 * Bulkhead statistics
 */
export interface BulkheadStats {
  name: string;
  activeCount: number;
  queuedCount: number;
  maxConcurrent: number;
  maxQueueSize: number;
  totalExecuted: number;
  totalRejected: number;
}

/**
 * Queued request
 */
interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Bulkhead pattern implementation
 * Isolates resources by limiting concurrent executions
 */
export class Bulkhead {
  private readonly logger = new Logger(Bulkhead.name);
  private activeCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly queue: QueuedRequest<any>[] = [];
  private totalExecuted = 0;
  private totalRejected = 0;
  private readonly config: Required<BulkheadConfig>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: BulkheadConfig) {
    this.config = {
      maxQueueSize: config.maxQueueSize ?? 0,
      queueTimeout: config.queueTimeout ?? 30000,
      name: config.name ?? 'Bulkhead',
      onBulkheadFull: config.onBulkheadFull ?? (() => undefined),
      maxConcurrent: config.maxConcurrent,
    };

    // Start cleanup for timed out queued requests
    this.startCleanup();
  }

  /**
   * Execute function with bulkhead protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we can execute immediately
    if (this.activeCount < this.config.maxConcurrent) {
      return this.executeImmediate(fn);
    }

    // Check if we can queue
    if (this.queue.length >= this.config.maxQueueSize) {
      this.totalRejected++;
      this.config.onBulkheadFull();
      throw new BulkheadFullError(
        `Bulkhead '${this.config.name}' is full (${this.activeCount} active, ${this.queue.length} queued)`
      );
    }

    // Queue the request
    return this.enqueue(fn);
  }

  /**
   * Execute immediately
   */
  private async executeImmediate<T>(fn: () => Promise<T>): Promise<T> {
    this.activeCount++;
    this.totalExecuted++;

    try {
      const result = await fn();
      return result;
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  /**
   * Enqueue request
   */
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        fn,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(request);

      this.logger.debug(
        `Request queued in bulkhead '${this.config.name}' (queue size: ${this.queue.length})`
      );
    });
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    while (
      this.activeCount < this.config.maxConcurrent &&
      this.queue.length > 0
    ) {
      const request = this.queue.shift();
      if (!request) break;

      // Check if request timed out
      const age = Date.now() - request.timestamp;
      if (age > this.config.queueTimeout) {
        this.totalRejected++;
        request.reject(
          new BulkheadTimeoutError(
            `Request timed out in bulkhead '${this.config.name}' after ${age}ms`
          )
        );
        continue;
      }

      // Execute request
      this.activeCount++;
      this.totalExecuted++;

      request
        .fn()
        .then((result) => {
          request.resolve(result);
        })
        .catch((error) => {
          request.reject(error);
        })
        .finally(() => {
          this.activeCount--;
          this.processQueue();
        });
    }
  }

  /**
   * Start cleanup interval for timed out requests
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let removed = 0;

      for (let i = this.queue.length - 1; i >= 0; i--) {
        const request = this.queue[i];
        const age = now - request.timestamp;

        if (age > this.config.queueTimeout) {
          this.queue.splice(i, 1);
          this.totalRejected++;
          request.reject(
            new BulkheadTimeoutError(
              `Request timed out in bulkhead '${this.config.name}' after ${age}ms`
            )
          );
          removed++;
        }
      }

      if (removed > 0) {
        this.logger.warn(
          `Removed ${removed} timed out requests from bulkhead '${this.config.name}'`
        );
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get statistics
   */
  getStats(): BulkheadStats {
    return {
      name: this.config.name,
      activeCount: this.activeCount,
      queuedCount: this.queue.length,
      maxConcurrent: this.config.maxConcurrent,
      maxQueueSize: this.config.maxQueueSize,
      totalExecuted: this.totalExecuted,
      totalRejected: this.totalRejected,
    };
  }

  /**
   * Destroy bulkhead and clear resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Reject all queued requests
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        request.reject(
          new Error(`Bulkhead '${this.config.name}' is being destroyed`)
        );
      }
    }
  }
}

/**
 * Error thrown when bulkhead is full
 */
export class BulkheadFullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulkheadFullError';
  }
}

/**
 * Error thrown when request times out in queue
 */
export class BulkheadTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulkheadTimeoutError';
  }
}
