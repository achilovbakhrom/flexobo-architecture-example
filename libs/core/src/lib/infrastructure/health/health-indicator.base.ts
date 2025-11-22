/**
 * Base health indicator class
 */

import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthStatus,
  HealthCheckConfig,
} from './health.types';

/**
 * Abstract base class for health indicators
 */
export abstract class BaseHealthIndicator implements HealthIndicator {
  constructor(
    public readonly name: string,
    protected readonly config: HealthCheckConfig = {}
  ) {}

  /**
   * Perform health check
   */
  async check(): Promise<HealthIndicatorResult> {
    const start = Date.now();
    const timeout = this.config.timeout || 5000;

    try {
      // Execute check with timeout
      const result = await this.executeWithTimeout(
        this.performCheck(),
        timeout
      );

      return {
        ...result,
        timestamp: new Date(),
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        status: HealthStatus.DOWN,
        message: `Health check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        timestamp: new Date(),
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Implement health check logic in derived classes
   */
  protected abstract performCheck(): Promise<HealthIndicatorResult>;

  /**
   * Execute promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      ),
    ]);
  }

  /**
   * Helper to create UP result
   */
  protected up(
    message?: string,
    details?: Record<string, unknown>
  ): HealthIndicatorResult {
    return {
      status: HealthStatus.UP,
      message: message || `${this.name} is healthy`,
      details,
      timestamp: new Date(),
    };
  }

  /**
   * Helper to create DOWN result
   */
  protected down(
    message: string,
    details?: Record<string, unknown>
  ): HealthIndicatorResult {
    return {
      status: HealthStatus.DOWN,
      message,
      details,
      timestamp: new Date(),
    };
  }

  /**
   * Helper to create DEGRADED result
   */
  protected degraded(
    message: string,
    details?: Record<string, unknown>
  ): HealthIndicatorResult {
    return {
      status: HealthStatus.DEGRADED,
      message,
      details,
      timestamp: new Date(),
    };
  }
}
