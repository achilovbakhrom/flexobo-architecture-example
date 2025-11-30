/**
 * Health Checker Service
 *
 * Monitors health of registered services and maintains health status cache.
 * Implements Single Responsibility Principle - only handles health checking.
 */

import { Injectable, Logger, Inject, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IHealthChecker,
  IServiceRegistry,
  ServiceDefinition,
  ServiceHealthStatus,
  SERVICE_REGISTRY,
} from '../interfaces';

export interface HealthCheckerConfig {
  /** Interval between health checks in ms */
  checkInterval: number;
  /** Timeout for health check requests in ms */
  checkTimeout: number;
  /** Number of failed checks before marking unhealthy */
  unhealthyThreshold: number;
  /** Number of successful checks before marking healthy */
  healthyThreshold: number;
}

@Injectable()
export class HealthChecker implements IHealthChecker, OnModuleDestroy {
  private readonly logger = new Logger(HealthChecker.name);
  private readonly healthStatus = new Map<string, ServiceHealthStatus>();
  private readonly failureCounts = new Map<string, number>();
  private readonly successCounts = new Map<string, number>();
  private checkIntervalId: NodeJS.Timeout | null = null;

  private config: HealthCheckerConfig = {
    checkInterval: 30000, // 30 seconds
    checkTimeout: 5000, // 5 seconds
    unhealthyThreshold: 3,
    healthyThreshold: 2,
  };

  constructor(
    @Inject(SERVICE_REGISTRY)
    private readonly serviceRegistry: IServiceRegistry,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Initialize health checker with optional config
   */
  initialize(config?: Partial<HealthCheckerConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize health status for all services
    for (const service of this.serviceRegistry.getAllServices()) {
      this.healthStatus.set(service.name, {
        name: service.name,
        status: 'unknown',
        lastChecked: new Date(),
      });
    }

    // Start periodic health checks
    this.startHealthCheckInterval();

    // Run initial health check
    this.checkAllServices();

    this.logger.log(
      `Health checker initialized with ${this.config.checkInterval}ms interval`
    );
  }

  /**
   * Check health of a specific service
   */
  async checkService(service: ServiceDefinition): Promise<ServiceHealthStatus> {
    const startTime = Date.now();

    try {
      const healthUrl = this.buildHealthCheckUrl(service);
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.checkTimeout
      );

      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        if (response.ok) {
          return this.recordSuccess(service.name, latency);
        } else {
          return this.recordFailure(
            service.name,
            `HTTP ${response.status}: ${response.statusText}`
          );
        }
      } catch (error) {
        clearTimeout(timeoutId);

        if ((error as Error).name === 'AbortError') {
          return this.recordFailure(service.name, 'Health check timeout');
        }
        throw error;
      }
    } catch (error) {
      return this.recordFailure(service.name, (error as Error).message);
    }
  }

  /**
   * Check health of all registered services
   */
  async checkAllServices(): Promise<Map<string, ServiceHealthStatus>> {
    const services = this.serviceRegistry.getAllServices();
    const results = new Map<string, ServiceHealthStatus>();

    // Run health checks in parallel
    const checks = services.map(async (service) => {
      const status = await this.checkService(service);
      results.set(service.name, status);
    });

    await Promise.allSettled(checks);

    return results;
  }

  /**
   * Get cached health status for a service
   */
  getServiceHealth(serviceName: string): ServiceHealthStatus | undefined {
    return this.healthStatus.get(serviceName);
  }

  /**
   * Get all cached health statuses
   */
  getAllHealthStatuses(): Map<string, ServiceHealthStatus> {
    return new Map(this.healthStatus);
  }

  /**
   * Check if a service is healthy
   */
  isServiceHealthy(serviceName: string): boolean {
    const status = this.healthStatus.get(serviceName);
    return status?.status === 'healthy';
  }

  /**
   * Record successful health check
   */
  private recordSuccess(
    serviceName: string,
    latency: number
  ): ServiceHealthStatus {
    // Reset failure count
    this.failureCounts.set(serviceName, 0);

    // Increment success count
    const successCount = (this.successCounts.get(serviceName) || 0) + 1;
    this.successCounts.set(serviceName, successCount);

    const previousStatus = this.healthStatus.get(serviceName);
    const isNowHealthy = successCount >= this.config.healthyThreshold;

    const newStatus: ServiceHealthStatus = {
      name: serviceName,
      status: isNowHealthy ? 'healthy' : previousStatus?.status || 'unknown',
      latency,
      lastChecked: new Date(),
    };

    this.healthStatus.set(serviceName, newStatus);

    // Emit event if status changed to healthy
    if (previousStatus?.status !== 'healthy' && isNowHealthy) {
      this.logger.log(`Service ${serviceName} is now healthy`);
      this.eventEmitter.emit('service.health.changed', {
        type: 'SERVICE_HEALTH_CHANGED',
        name: serviceName,
        status: newStatus,
      });
    }

    return newStatus;
  }

  /**
   * Record failed health check
   */
  private recordFailure(
    serviceName: string,
    error: string
  ): ServiceHealthStatus {
    // Reset success count
    this.successCounts.set(serviceName, 0);

    // Increment failure count
    const failureCount = (this.failureCounts.get(serviceName) || 0) + 1;
    this.failureCounts.set(serviceName, failureCount);

    const previousStatus = this.healthStatus.get(serviceName);
    const isNowUnhealthy = failureCount >= this.config.unhealthyThreshold;

    const newStatus: ServiceHealthStatus = {
      name: serviceName,
      status: isNowUnhealthy ? 'unhealthy' : previousStatus?.status || 'unknown',
      lastChecked: new Date(),
      error,
    };

    this.healthStatus.set(serviceName, newStatus);

    // Emit event if status changed to unhealthy
    if (previousStatus?.status !== 'unhealthy' && isNowUnhealthy) {
      this.logger.warn(`Service ${serviceName} is now unhealthy: ${error}`);
      this.eventEmitter.emit('service.health.changed', {
        type: 'SERVICE_HEALTH_CHANGED',
        name: serviceName,
        status: newStatus,
      });
    }

    return newStatus;
  }

  /**
   * Build health check URL for service
   */
  private buildHealthCheckUrl(service: ServiceDefinition): string {
    const healthPath = service.healthCheckPath || '/health';
    return `${service.baseUrl}${healthPath}`;
  }

  /**
   * Start periodic health check interval
   */
  private startHealthCheckInterval(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    this.checkIntervalId = setInterval(() => {
      this.checkAllServices();
    }, this.config.checkInterval);
  }

  /**
   * Stop health checking
   */
  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    this.logger.log('Health checker stopped');
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    this.stop();
  }

  /**
   * Force immediate health check for a service
   */
  async forceCheck(serviceName: string): Promise<ServiceHealthStatus | null> {
    const service = this.serviceRegistry.getService(serviceName);

    if (!service) {
      return null;
    }

    return this.checkService(service);
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
  } {
    const statuses = Array.from(this.healthStatus.values());

    return {
      total: statuses.length,
      healthy: statuses.filter((s) => s.status === 'healthy').length,
      unhealthy: statuses.filter((s) => s.status === 'unhealthy').length,
      unknown: statuses.filter((s) => s.status === 'unknown').length,
    };
  }
}
