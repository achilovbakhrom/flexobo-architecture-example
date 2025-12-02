/**
 * HTTP endpoint health indicator
 */

import { BaseHealthIndicator } from '../health-indicator.base';
import {
  HealthIndicatorResult,
  HttpHealthOptions,
  HealthCheckConfig,
} from '../health.types';

/**
 * HTTP endpoint health indicator
 */
export class HttpHealthIndicator extends BaseHealthIndicator {
  constructor(
    name: string,
    private readonly httpClient: (options: {
      url: string;
      method: string;
      headers?: Record<string, string>;
      timeout?: number;
    }) => Promise<{ status: number; data?: unknown }>,
    private readonly options: HttpHealthOptions,
    config?: HealthCheckConfig
  ) {
    super(name, config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    const {
      url,
      method = 'GET',
      expectedStatus = 200,
      headers,
      timeout = 5000,
    } = this.options;

    try {
      const start = Date.now();
      const response = await this.httpClient({
        url,
        method,
        headers,
        timeout,
      });
      const duration = Date.now() - start;

      if (response.status !== expectedStatus) {
        return this.down(
          `HTTP endpoint returned unexpected status: ${response.status}`,
          {
            url,
            expectedStatus,
            actualStatus: response.status,
            duration: `${duration}ms`,
          }
        );
      }

      return this.up('HTTP endpoint is healthy', {
        url,
        status: response.status,
        duration: `${duration}ms`,
      });
    } catch (error) {
      return this.down(
        `HTTP endpoint check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          url,
        }
      );
    }
  }
}
