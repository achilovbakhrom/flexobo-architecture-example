/**
 * Health check usage examples
 *
 * Demonstrates comprehensive health monitoring for microservices
 */

import { Module } from '@nestjs/common';
import {
  HealthModule,
  HealthService,
  PostgreSQLHealthIndicator,
  RedisHealthIndicator,
  CacheHealthIndicator,
  RabbitMQHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  CPUHealthIndicator,
  HttpHealthIndicator,
  BaseHealthIndicator,
  HealthIndicatorResult,
} from './index';

// ============================================================
// 1. Basic Health Module Setup
// ============================================================

@Module({
  imports: [
    HealthModule.forRoot({
      version: '1.0.0',
      enableEndpoints: true,
      global: true,
    }),
  ],
})
class BasicAppModule {}

// ============================================================
// 2. PostgreSQL Health Check
// ============================================================

function setupPostgreSQLHealth() {
  // Mock Prisma client
  const prismaClient = {
    $queryRaw: async (_query: unknown) => {
      return [{ result: 1 }];
    },
  };

  const postgresHealth = new PostgreSQLHealthIndicator(
    async (query: string) => {
      return await prismaClient.$queryRaw(query as never);
    },
    {
      query: 'SELECT 1',
      timeout: 5000,
    }
  );

  return postgresHealth;
}

// ============================================================
// 3. Redis Health Check
// ============================================================

function setupRedisHealth() {
  // Mock Redis client
  const redisClient = {
    ping: async () => 'PONG',
  };

  const redisHealth = new RedisHealthIndicator(
    async () => await redisClient.ping()
  );

  return redisHealth;
}

// ============================================================
// 4. Generic Cache Health Check with Read/Write Test
// ============================================================

function setupCacheHealth() {
  // Mock cache client
  const cacheClient = new Map<string, string>();

  const cacheHealth = new CacheHealthIndicator(
    'cache',
    async (key: string) => cacheClient.get(key) || null,
    async (key: string, value: string) => {
      cacheClient.set(key, value);
    },
    async (key: string) => {
      cacheClient.delete(key);
    },
    { key: 'health_check_test' }
  );

  return cacheHealth;
}

// ============================================================
// 5. RabbitMQ Health Check
// ============================================================

function setupRabbitMQHealth() {
  // Mock RabbitMQ connection
  const rabbitConnection = {
    isConnected: true,
    getQueueStats: async (_queue: string) => ({
      messageCount: 10,
      consumerCount: 2,
    }),
  };

  const rabbitHealth = new RabbitMQHealthIndicator(
    async () => rabbitConnection.isConnected,
    async (queue: string) => await rabbitConnection.getQueueStats(queue),
    {
      checkQueues: ['orders', 'payments', 'notifications'],
      timeout: 5000,
    }
  );

  return rabbitHealth;
}

// ============================================================
// 6. System Resource Health Checks
// ============================================================

function setupSystemHealthChecks() {
  // Memory health
  const memoryHealth = new MemoryHealthIndicator({
    thresholdPercent: 85,
  });

  // CPU health
  const cpuHealth = new CPUHealthIndicator(90);

  // Disk health
  const diskHealth = new DiskHealthIndicator(
    async (_path: string) => ({
      free: 100 * 1024 * 1024 * 1024, // 100 GB
      size: 500 * 1024 * 1024 * 1024, // 500 GB
    }),
    {
      path: '/',
      thresholdPercent: 85,
    }
  );

  return { memoryHealth, cpuHealth, diskHealth };
}

// ============================================================
// 7. HTTP Endpoint Health Check (External Services)
// ============================================================

function setupHttpHealthCheck() {
  // Mock HTTP client
  const httpClient = async (_options: {
    url: string;
    method: string;
    timeout?: number;
  }) => {
    return { status: 200, data: { ok: true } };
  };

  const paymentServiceHealth = new HttpHealthIndicator(
    'payment-service',
    httpClient,
    {
      url: 'http://payment-service:3000/health',
      method: 'GET',
      expectedStatus: 200,
      timeout: 3000,
    }
  );

  return paymentServiceHealth;
}

// ============================================================
// 8. Custom Health Indicator
// ============================================================

/**
 * Custom business logic health check
 */
class EventStoreHealthIndicator extends BaseHealthIndicator {
  constructor(
    private readonly getEventCount: () => Promise<number>,
    private readonly getOldestEvent: () => Promise<Date | null>
  ) {
    super('event-store');
  }

  protected async performCheck(): Promise<HealthIndicatorResult> {
    try {
      const eventCount = await this.getEventCount();
      const oldestEvent = await this.getOldestEvent();

      const details: Record<string, unknown> = {
        eventCount,
        oldestEvent: oldestEvent?.toISOString() || 'none',
      };

      // Check if event store is too far behind
      if (oldestEvent) {
        const ageMs = Date.now() - oldestEvent.getTime();
        const ageHours = ageMs / (1000 * 60 * 60);

        details['ageHours'] = ageHours.toFixed(2);

        if (ageHours > 24) {
          return this.degraded(
            'Event store has very old unprocessed events',
            details
          );
        }
      }

      return this.up('Event store is healthy', details);
    } catch (error) {
      return this.down(
        `Event store check failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

// ============================================================
// 9. Complete Application Setup
// ============================================================

@Module({
  imports: [
    HealthModule.forRoot({
      version: '1.0.0',
      enableEndpoints: true,

      // Application health checks
      indicators: [
        new MemoryHealthIndicator({ thresholdPercent: 85 }),
        new CPUHealthIndicator(90),
        new EventStoreHealthIndicator(
          async () => 1000,
          async () => new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
        ),
      ],

      // External dependencies
      dependencies: [
        setupPostgreSQLHealth(),
        setupRedisHealth(),
        setupRabbitMQHealth(),
        setupHttpHealthCheck(),
      ],

      global: true,
    }),
  ],
})
class CompleteAppModule {}

// ============================================================
// 10. Programmatic Health Checks
// ============================================================

async function demonstrateProgrammaticChecks() {
  const healthService = new HealthService();

  // Register indicators
  healthService.registerIndicator(new MemoryHealthIndicator());
  healthService.registerIndicator(setupPostgreSQLHealth(), true); // dependency

  healthService.setVersion('1.0.0');

  // Full health check
  const health = await healthService.check();
  console.log('Health status:', health.status);
  console.log('Uptime:', health.uptime, 'ms');
  console.log('Checks:', health.checks);
  console.log('Dependencies:', health.dependencies);

  // Quick liveness check (only app indicators)
  const isHealthy = await healthService.isHealthy();
  console.log('Is healthy:', isHealthy);

  // Readiness check (app + dependencies)
  const isReady = await healthService.isReady();
  console.log('Is ready:', isReady);
}

// ============================================================
// 11. Health Check Endpoints
// ============================================================

/**
 * Standard endpoints provided by HealthController:
 *
 * GET /health
 * Returns full health check with details
 * Response:
 * {
 *   "status": "UP",
 *   "timestamp": "2025-11-22T10:30:00.000Z",
 *   "uptime": 3600000,
 *   "version": "1.0.0",
 *   "checks": {
 *     "memory": {
 *       "status": "UP",
 *       "message": "Memory usage is healthy",
 *       "details": {
 *         "heapUsed": "150.25 MB",
 *         "heapTotal": "200.00 MB",
 *         "usagePercent": "75.13%"
 *       },
 *       "timestamp": "2025-11-22T10:30:00.000Z",
 *       "duration": 2
 *     }
 *   },
 *   "dependencies": {
 *     "postgresql": {
 *       "status": "UP",
 *       "message": "PostgreSQL is healthy"
 *     }
 *   }
 * }
 *
 * GET /health/live
 * Kubernetes liveness probe (application only)
 * Returns 200 if app is running, 503 if down
 * Response: { "status": "UP", "timestamp": "..." }
 *
 * GET /health/ready
 * Kubernetes readiness probe (app + dependencies)
 * Returns 200 if ready to serve traffic, 503 if not
 * Response: { "status": "UP", "timestamp": "..." }
 */

// ============================================================
// 12. Kubernetes Integration
// ============================================================

/**
 * Kubernetes deployment with health checks:
 *
 * ```yaml
 * apiVersion: apps/v1
 * kind: Deployment
 * metadata:
 *   name: order-service
 * spec:
 *   replicas: 3
 *   template:
 *     spec:
 *       containers:
 *       - name: order-service
 *         image: order-service:1.0.0
 *         ports:
 *         - containerPort: 3000
 *
 *         # Liveness probe - restart if fails
 *         livenessProbe:
 *           httpGet:
 *             path: /health/live
 *             port: 3000
 *           initialDelaySeconds: 30
 *           periodSeconds: 10
 *           timeoutSeconds: 5
 *           failureThreshold: 3
 *
 *         # Readiness probe - stop routing traffic if fails
 *         readinessProbe:
 *           httpGet:
 *             path: /health/ready
 *             port: 3000
 *           initialDelaySeconds: 10
 *           periodSeconds: 5
 *           timeoutSeconds: 3
 *           failureThreshold: 3
 *
 *         # Startup probe - wait for app to start
 *         startupProbe:
 *           httpGet:
 *             path: /health/live
 *             port: 3000
 *           initialDelaySeconds: 0
 *           periodSeconds: 5
 *           timeoutSeconds: 3
 *           failureThreshold: 30
 * ```
 */

// ============================================================
// 13. Health Status Examples
// ============================================================

/**
 * Status: UP
 * - All checks pass
 * - Application and dependencies healthy
 * - Ready to serve traffic
 *
 * Status: DEGRADED
 * - Application is running
 * - Some non-critical issues (e.g., high memory, queue backlog)
 * - Still serving traffic but with warnings
 *
 * Status: DOWN
 * - Critical component failed
 * - Cannot serve traffic
 * - Needs intervention
 *
 * Status: UNKNOWN
 * - Health check failed to execute
 * - Cannot determine status
 */

// ============================================================
// 14. Monitoring Integration
// ============================================================

/**
 * Prometheus metrics for health checks:
 *
 * # HELP health_check_status Health check status (1=UP, 0=DOWN)
 * # TYPE health_check_status gauge
 * health_check_status{check="postgresql"} 1
 * health_check_status{check="redis"} 1
 * health_check_status{check="rabbitmq"} 0
 *
 * # HELP health_check_duration_ms Health check duration in milliseconds
 * # TYPE health_check_duration_ms histogram
 * health_check_duration_ms{check="postgresql"} 15
 * health_check_duration_ms{check="redis"} 2
 *
 * Alerts:
 * - HealthCheckFailing: Any check DOWN for > 5 minutes
 * - HealthCheckDegraded: Any check DEGRADED for > 15 minutes
 * - DependencyUnhealthy: Dependency DOWN for > 2 minutes
 */

export {
  BasicAppModule,
  CompleteAppModule,
  setupPostgreSQLHealth,
  setupRedisHealth,
  setupCacheHealth,
  setupRabbitMQHealth,
  setupSystemHealthChecks,
  setupHttpHealthCheck,
  EventStoreHealthIndicator,
  demonstrateProgrammaticChecks,
};
