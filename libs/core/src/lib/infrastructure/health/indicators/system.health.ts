/**
 * System resource health indicators
 */

import { BaseHealthIndicator } from '../health-indicator.base';
import {
  HealthIndicatorResult,
  DiskHealthOptions,
  MemoryHealthOptions,
  HealthCheckConfig,
} from '../health.types';

/**
 * Memory health indicator
 */
export class MemoryHealthIndicator extends BaseHealthIndicator {
  constructor(
    private readonly options: MemoryHealthOptions = {},
    config?: HealthCheckConfig
  ) {
    super('memory', config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const usagePercent = (heapUsed / heapTotal) * 100;

    const threshold = this.options.thresholdPercent || 90;

    const details = {
      heapUsed: `${(heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(heapTotal / 1024 / 1024).toFixed(2)} MB`,
      usagePercent: `${usagePercent.toFixed(2)}%`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
    };

    if (usagePercent > threshold) {
      return this.degraded(
        `Memory usage is high: ${usagePercent.toFixed(2)}%`,
        details
      );
    }

    return this.up('Memory usage is healthy', details);
  }
}

/**
 * Disk space health indicator
 */
export class DiskHealthIndicator extends BaseHealthIndicator {
  constructor(
    private readonly checkDiskSpace: (path: string) => Promise<{
      free: number;
      size: number;
    }>,
    private readonly options: DiskHealthOptions = {},
    config?: HealthCheckConfig
  ) {
    super('disk', config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    const path = this.options.path || '/';

    try {
      const diskSpace = await this.checkDiskSpace(path);
      const usedSpace = diskSpace.size - diskSpace.free;
      const usagePercent = (usedSpace / diskSpace.size) * 100;

      const threshold = this.options.thresholdPercent || 90;

      const details = {
        path,
        free: `${(diskSpace.free / 1024 / 1024 / 1024).toFixed(2)} GB`,
        size: `${(diskSpace.size / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usagePercent: `${usagePercent.toFixed(2)}%`,
      };

      if (usagePercent > threshold) {
        return this.degraded(
          `Disk usage is high: ${usagePercent.toFixed(2)}%`,
          details
        );
      }

      return this.up('Disk space is healthy', details);
    } catch (error) {
      return this.down(
        `Disk check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

/**
 * CPU health indicator
 */
export class CPUHealthIndicator extends BaseHealthIndicator {
  constructor(
    private readonly thresholdPercent = 90,
    config?: HealthCheckConfig
  ) {
    super('cpu', config);
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    // Calculate CPU percentage
    const totalCPU = cpuUsage.user + cpuUsage.system;
    const totalTime = uptime * 1000000; // Convert to microseconds
    const cpuPercent = (totalCPU / totalTime) * 100;

    const details = {
      user: `${(cpuUsage.user / 1000000).toFixed(2)}s`,
      system: `${(cpuUsage.system / 1000000).toFixed(2)}s`,
      uptime: `${uptime.toFixed(2)}s`,
      cpuPercent: `${cpuPercent.toFixed(2)}%`,
    };

    if (cpuPercent > this.thresholdPercent) {
      return this.degraded(
        `CPU usage is high: ${cpuPercent.toFixed(2)}%`,
        details
      );
    }

    return this.up('CPU usage is healthy', details);
  }
}
