/**
 * Health check service
 */

import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthCheckResponse,
  HealthStatus,
  HealthIndicatorResult,
} from './health.types';

/**
 * Central health check service
 */
@Injectable()
export class HealthService {
  private indicators = new Map<string, HealthIndicator>();
  private dependencies = new Map<string, HealthIndicator>();
  private startTime = Date.now();
  private version?: string;

  /**
   * Register a health indicator
   */
  registerIndicator(indicator: HealthIndicator, isDependency = false): void {
    const map = isDependency ? this.dependencies : this.indicators;
    map.set(indicator.name, indicator);
  }

  /**
   * Unregister a health indicator
   */
  unregisterIndicator(name: string): void {
    this.indicators.delete(name);
    this.dependencies.delete(name);
  }

  /**
   * Set application version
   */
  setVersion(version: string): void {
    this.version = version;
  }

  /**
   * Perform all health checks
   */
  async check(): Promise<HealthCheckResponse> {
    const timestamp = new Date();
    const uptime = Date.now() - this.startTime;

    // Run all checks in parallel
    const [checks, deps] = await Promise.all([
      this.runChecks(this.indicators),
      this.runChecks(this.dependencies),
    ]);

    // Determine overall status
    const overallStatus = this.determineOverallStatus([
      ...Object.values(checks),
      ...Object.values(deps),
    ]);

    return {
      status: overallStatus,
      timestamp,
      uptime,
      version: this.version,
      checks,
      dependencies: Object.keys(deps).length > 0 ? deps : undefined,
    };
  }

  /**
   * Check if service is healthy (only application checks, not dependencies)
   */
  async isHealthy(): Promise<boolean> {
    const checks = await this.runChecks(this.indicators);
    const results = Object.values(checks);

    return results.every((r) => r.status === HealthStatus.UP);
  }

  /**
   * Check if service is ready (all checks including dependencies)
   */
  async isReady(): Promise<boolean> {
    const response = await this.check();
    return response.status === HealthStatus.UP;
  }

  /**
   * Run checks for a set of indicators
   */
  private async runChecks(
    indicators: Map<string, HealthIndicator>
  ): Promise<Record<string, HealthIndicatorResult>> {
    const results: Record<string, HealthIndicatorResult> = {};

    // Run checks in parallel
    const entries = Array.from(indicators.entries());
    const checks = await Promise.all(
      entries.map(async ([name, indicator]) => {
        try {
          const result = await indicator.check();
          return { name, result };
        } catch (error) {
          return {
            name,
            result: {
              status: HealthStatus.DOWN,
              message: `Check failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
              timestamp: new Date(),
              error: error instanceof Error ? error.message : String(error),
            },
          };
        }
      })
    );

    // Build results object
    for (const { name, result } of checks) {
      results[name] = result;
    }

    return results;
  }

  /**
   * Determine overall status from individual results
   */
  private determineOverallStatus(
    results: HealthIndicatorResult[]
  ): HealthStatus {
    if (results.length === 0) {
      return HealthStatus.UNKNOWN;
    }

    // If any check is DOWN, overall is DOWN
    if (results.some((r) => r.status === HealthStatus.DOWN)) {
      return HealthStatus.DOWN;
    }

    // If any check is DEGRADED, overall is DEGRADED
    if (results.some((r) => r.status === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }

    // If any check is UNKNOWN, overall is UNKNOWN
    if (results.some((r) => r.status === HealthStatus.UNKNOWN)) {
      return HealthStatus.UNKNOWN;
    }

    // All checks are UP
    return HealthStatus.UP;
  }
}
