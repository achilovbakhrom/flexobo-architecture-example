/**
 * Health check types and interfaces
 */

/**
 * Health status levels
 */
export enum HealthStatus {
  UP = 'UP', // Service is healthy
  DOWN = 'DOWN', // Service is unhealthy
  DEGRADED = 'DEGRADED', // Service is running but with issues
  UNKNOWN = 'UNKNOWN', // Cannot determine health
}

/**
 * Individual health indicator result
 */
export interface HealthIndicatorResult {
  status: HealthStatus;
  message?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  duration?: number; // Check duration in ms
  error?: string;
}

/**
 * Overall health check response
 */
export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  version?: string;
  checks: Record<string, HealthIndicatorResult>;
  dependencies?: Record<string, HealthIndicatorResult>;
}

/**
 * Health indicator interface
 */
export interface HealthIndicator {
  name: string;
  check(): Promise<HealthIndicatorResult>;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  timeout?: number; // Default timeout for checks (ms)
  checkInterval?: number; // Interval between checks (ms)
  retries?: number; // Number of retries on failure
  gracePeriod?: number; // Grace period before marking as DOWN (ms)
}

/**
 * Database health check options
 */
export interface DatabaseHealthOptions {
  timeout?: number;
  query?: string;
}

/**
 * Cache health check options
 */
export interface CacheHealthOptions {
  timeout?: number;
  key?: string;
}

/**
 * Message queue health check options
 */
export interface MessageQueueHealthOptions {
  timeout?: number;
  checkQueues?: string[];
}

/**
 * HTTP endpoint health check options
 */
export interface HttpHealthOptions {
  url: string;
  method?: 'GET' | 'POST' | 'HEAD';
  timeout?: number;
  expectedStatus?: number;
  headers?: Record<string, string>;
}

/**
 * Disk space health check options
 */
export interface DiskHealthOptions {
  path?: string;
  thresholdPercent?: number; // Alert if usage > threshold
}

/**
 * Memory health check options
 */
export interface MemoryHealthOptions {
  thresholdPercent?: number;
}
