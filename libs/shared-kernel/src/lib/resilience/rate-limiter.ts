import { Logger } from '@nestjs/common';

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   * Default: 60000 (1 minute)
   */
  windowMs?: number;

  /**
   * Strategy for rate limiting
   * Default: 'sliding-window'
   */
  strategy?: 'fixed-window' | 'sliding-window' | 'token-bucket';

  /**
   * Key generator function for multi-tenancy
   * Default: 'global'
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyGenerator?: (...args: any[]) => string;

  /**
   * Callback when rate limit is exceeded
   */
  onRateLimitExceeded?: (key: string) => void;

  /**
   * Name for logging
   */
  name?: string;
}

/**
 * Rate limiter statistics
 */
export interface RateLimiterStats {
  key: string;
  requestCount: number;
  remainingRequests: number;
  resetTime: number;
}

/**
 * Request bucket for tracking
 */
interface RequestBucket {
  count: number;
  resetTime: number;
  requests: number[]; // Timestamps for sliding window
}

/**
 * Rate limiter implementation
 * Prevents overwhelming services with too many requests
 */
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private readonly buckets = new Map<string, RequestBucket>();
  private readonly config: Required<RateLimiterConfig>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimiterConfig) {
    this.config = {
      windowMs: config.windowMs ?? 60000,
      strategy: config.strategy ?? 'sliding-window',
      keyGenerator: config.keyGenerator ?? (() => 'global'),
      onRateLimitExceeded: config.onRateLimitExceeded ?? (() => undefined),
      name: config.name ?? 'RateLimiter',
      maxRequests: config.maxRequests,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if request is allowed
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async checkLimit(...args: any[]): Promise<boolean> {
    const key = this.config.keyGenerator(...args);
    const now = Date.now();

    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        count: 0,
        resetTime: now + this.config.windowMs,
        requests: [],
      };
      this.buckets.set(key, bucket);
    }

    switch (this.config.strategy) {
      case 'fixed-window':
        return this.checkFixedWindow(bucket, now);
      case 'sliding-window':
        return this.checkSlidingWindow(bucket, now);
      case 'token-bucket':
        return this.checkTokenBucket(bucket, now);
      default:
        return this.checkSlidingWindow(bucket, now);
    }
  }

  /**
   * Execute with rate limiting
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute<T>(fn: () => Promise<T>, ...args: any[]): Promise<T> {
    const allowed = await this.checkLimit(...args);

    if (!allowed) {
      const key = this.config.keyGenerator(...args);
      this.config.onRateLimitExceeded(key);
      throw new RateLimitExceededError(
        `Rate limit exceeded for ${this.config.name} (key: ${key})`
      );
    }

    return fn();
  }

  /**
   * Fixed window strategy
   */
  private checkFixedWindow(bucket: RequestBucket, now: number): boolean {
    // Reset if window expired
    if (now >= bucket.resetTime) {
      bucket.count = 0;
      bucket.resetTime = now + this.config.windowMs;
    }

    if (bucket.count >= this.config.maxRequests) {
      return false;
    }

    bucket.count++;
    return true;
  }

  /**
   * Sliding window strategy
   */
  private checkSlidingWindow(bucket: RequestBucket, now: number): boolean {
    const windowStart = now - this.config.windowMs;

    // Remove old requests
    bucket.requests = bucket.requests.filter((time) => time > windowStart);

    if (bucket.requests.length >= this.config.maxRequests) {
      return false;
    }

    bucket.requests.push(now);
    return true;
  }

  /**
   * Token bucket strategy
   */
  private checkTokenBucket(bucket: RequestBucket, now: number): boolean {
    const elapsed = now - (bucket.resetTime - this.config.windowMs);
    const tokensToAdd = Math.floor(
      (elapsed / this.config.windowMs) * this.config.maxRequests
    );

    bucket.count = Math.min(
      this.config.maxRequests,
      bucket.count + tokensToAdd
    );
    bucket.resetTime = now + this.config.windowMs;

    if (bucket.count < 1) {
      return false;
    }

    bucket.count--;
    return true;
  }

  /**
   * Get statistics for a key
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStats(...args: any[]): RateLimiterStats {
    const key = this.config.keyGenerator(...args);
    const bucket = this.buckets.get(key);
    const now = Date.now();

    if (!bucket) {
      return {
        key,
        requestCount: 0,
        remainingRequests: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
      };
    }

    const windowStart = now - this.config.windowMs;
    const validRequests = bucket.requests.filter((time) => time > windowStart);

    return {
      key,
      requestCount: validRequests.length,
      remainingRequests: Math.max(
        0,
        this.config.maxRequests - validRequests.length
      ),
      resetTime: bucket.resetTime,
    };
  }

  /**
   * Reset rate limiter for a key
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reset(...args: any[]): void {
    const key = this.config.keyGenerator(...args);
    this.buckets.delete(key);
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    this.buckets.clear();
  }

  /**
   * Start cleanup interval to remove expired buckets
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of this.buckets.entries()) {
        const windowStart = now - this.config.windowMs;
        bucket.requests = bucket.requests.filter((time) => time > windowStart);

        // Remove bucket if no recent requests
        if (bucket.requests.length === 0 && now > bucket.resetTime) {
          this.buckets.delete(key);
        }
      }
    }, this.config.windowMs);
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}
