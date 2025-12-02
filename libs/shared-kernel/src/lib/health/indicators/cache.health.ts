/**
 * Cache health indicator
 */

import { BaseHealthIndicator } from '../health-indicator.base';
import {
  HealthIndicatorResult,
  CacheHealthOptions,
  HealthCheckConfig,
} from '../health.types';

/**
 * Redis health indicator
 */
export class RedisHealthIndicator extends BaseHealthIndicator {
  constructor(
    private readonly ping: () => Promise<string>,
    private readonly options: CacheHealthOptions = {},
    config?: HealthCheckConfig
  ) {
    super('redis', config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    try {
      const response = await this.ping();

      if (response !== 'PONG') {
        return this.down(`Redis ping failed: unexpected response ${response}`);
      }

      return this.up('Redis is healthy');
    } catch (error) {
      return this.down(
        `Redis check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

/**
 * Generic cache health indicator with get/set test
 */
export class CacheHealthIndicator extends BaseHealthIndicator {
  constructor(
    name: string,
    private readonly get: (key: string) => Promise<string | null>,
    private readonly set: (
      key: string,
      value: string,
      ttl?: number
    ) => Promise<void>,
    private readonly del: (key: string) => Promise<void>,
    private readonly options: CacheHealthOptions = {},
    config?: HealthCheckConfig
  ) {
    super(name, config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    const testKey = this.options.key || `health_check_${Date.now()}`;
    const testValue = 'ok';

    try {
      // Test write
      await this.set(testKey, testValue, 10);

      // Test read
      const value = await this.get(testKey);

      if (value !== testValue) {
        return this.down('Cache read/write test failed: value mismatch');
      }

      // Cleanup
      await this.del(testKey);

      return this.up('Cache is healthy', {
        operations: ['set', 'get', 'del'],
      });
    } catch (error) {
      // Try to cleanup on error
      try {
        await this.del(testKey);
      } catch {
        // Ignore cleanup errors
      }

      return this.down(
        `Cache check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
