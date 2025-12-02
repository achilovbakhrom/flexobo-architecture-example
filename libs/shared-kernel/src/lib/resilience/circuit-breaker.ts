import { Logger } from '@nestjs/common';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening circuit
   * Default: 5
   */
  failureThreshold?: number;

  /**
   * Success threshold in HALF_OPEN state before closing
   * Default: 2
   */
  successThreshold?: number;

  /**
   * Time window to track failures (milliseconds)
   * Default: 60000 (1 minute)
   */
  timeout?: number;

  /**
   * Time to wait before trying HALF_OPEN (milliseconds)
   * Default: 30000 (30 seconds)
   */
  resetTimeout?: number;

  /**
   * Custom error filter to determine if error should count
   */
  errorFilter?: (error: Error) => boolean;

  /**
   * Callback when circuit state changes
   */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;

  /**
   * Name for logging purposes
   */
  name?: string;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastStateChange: number;
}

/**
 * Circuit breaker implementation
 * Prevents cascading failures by failing fast when service is unavailable
 */
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalCalls = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private lastStateChange = Date.now();
  private nextAttempt = Date.now();
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000,
      resetTimeout: config.resetTimeout ?? 30000,
      errorFilter: config.errorFilter ?? (() => true),
      onStateChange: config.onStateChange ?? (() => undefined),
      name: config.name ?? 'CircuitBreaker',
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN for ${this.config.name}`
        );
      }

      // Try half-open
      this.changeState(CircuitState.HALF_OPEN);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.changeState(CircuitState.CLOSED);
        this.reset();
      }
    } else {
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.lastFailureTime = Date.now();
    this.totalFailures++;

    // Check if error should be counted
    if (!this.config.errorFilter(error)) {
      return;
    }

    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed in half-open, go back to open
      this.changeState(CircuitState.OPEN);
      this.nextAttempt = Date.now() + this.config.resetTimeout;
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.failureCount >= this.config.failureThreshold) {
        this.changeState(CircuitState.OPEN);
        this.nextAttempt = Date.now() + this.config.resetTimeout;
      }
    }
  }

  /**
   * Change circuit state
   */
  private changeState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    this.logger.log(
      `Circuit breaker '${this.config.name}' changed state: ${oldState} -> ${newState}`
    );

    this.config.onStateChange(oldState, newState);
  }

  /**
   * Reset circuit breaker counters
   */
  private reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChange: this.lastStateChange,
    };
  }

  /**
   * Manually open the circuit
   */
  open(): void {
    this.changeState(CircuitState.OPEN);
    this.nextAttempt = Date.now() + this.config.resetTimeout;
  }

  /**
   * Manually close the circuit
   */
  close(): void {
    this.changeState(CircuitState.CLOSED);
    this.reset();
  }

  /**
   * Manually set to half-open
   */
  halfOpen(): void {
    this.changeState(CircuitState.HALF_OPEN);
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
