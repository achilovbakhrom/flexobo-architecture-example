/**
 * OpenTelemetry observability usage example
 *
 * Demonstrates distributed tracing, metrics, and structured logging
 */

import { Injectable, Module } from '@nestjs/common';
import {
  initializeOpenTelemetry,
  Tracer,
  Traced,
  MetricsManager,
  BusinessMetrics,
  ObservabilityLogger,
  ObservabilityModule,
} from './index';
import { SpanKind } from '@opentelemetry/api';

// ============================================================
// 1. Initialize OpenTelemetry SDK (in main.ts)
// ============================================================

/**
 * Initialize OpenTelemetry before application bootstrap
 */
function initializeObservability() {
  const sdk = initializeOpenTelemetry({
    serviceName: 'order-service',
    serviceVersion: '1.0.0',
    environment: 'production',
    traceExporterUrl: 'http://localhost:4318/v1/traces', // Jaeger OTLP endpoint
    metricsExporterUrl: 'http://localhost:4318/v1/metrics',
    autoInstrumentation: true,
    resourceAttributes: {
      'service.namespace': 'flexobo',
      'deployment.region': 'us-east-1',
    },
  });

  // Handle shutdown gracefully
  process.on('SIGTERM', async () => {
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down successfully');
  });

  return sdk;
}

// ============================================================
// 2. Manual Tracing with Tracer
// ============================================================

@Injectable()
class OrderService {
  private readonly tracer = new Tracer();
  private readonly logger = new ObservabilityLogger('OrderService');
  private readonly metrics: BusinessMetrics;

  constructor(metricsManager: MetricsManager) {
    this.metrics = new BusinessMetrics(metricsManager);
  }

  /**
   * Create order with manual span
   */
  async createOrder(userId: string, items: string[]): Promise<string> {
    // Create a span for this operation
    return this.tracer.withSpan(
      'OrderService.createOrder',
      async (span) => {
        const start = Date.now();

        try {
          // Add attributes to span
          span.setAttributes({
            'user.id': userId,
            'order.items_count': items.length,
          });

          // Log with trace context
          this.logger.logWithData('Creating order', {
            userId,
            itemsCount: items.length,
          });

          // Simulate order creation
          const orderId = `order-${Date.now()}`;

          // Add event to span
          span.addEvent('order.created', {
            'order.id': orderId,
          });

          // Record metrics
          const duration = Date.now() - start;
          this.metrics.recordCommandExecution('CreateOrder', duration, true);

          this.logger.logWithData('Order created successfully', {
            orderId,
            userId,
          });

          return orderId;
        } catch (error) {
          // Error is automatically recorded by tracer.withSpan
          const duration = Date.now() - start;
          this.metrics.recordCommandExecution('CreateOrder', duration, false);

          this.logger.errorWithData(
            'Failed to create order',
            error instanceof Error ? error : new Error(String(error)),
            { userId }
          );
          throw error;
        }
      },
      {
        kind: SpanKind.SERVER, // This is a server operation
        attributes: {
          'service.operation': 'create_order',
        },
      }
    );
  }

  /**
   * Process payment with nested spans
   */
  async processPayment(orderId: string, amount: number): Promise<boolean> {
    return this.tracer.withSpan('OrderService.processPayment', async (span) => {
      span.setAttributes({
        'order.id': orderId,
        'payment.amount': amount,
      });

      // Call payment gateway (creates nested span with auto-instrumentation)
      const success = await this.callPaymentGateway(orderId, amount);

      // Record business metric
      if (success) {
        this.metrics.recordEventPublished('PaymentProcessed');
      }

      return success;
    });
  }

  /**
   * Call external payment gateway (auto-instrumented)
   */
  private async callPaymentGateway(
    orderId: string,
    amount: number
  ): Promise<boolean> {
    // HTTP calls are automatically traced by auto-instrumentation
    // This would create a nested span showing the HTTP request
    return this.tracer.withSpan(
      'PaymentGateway.charge',
      async (span) => {
        span.setAttributes({
          'payment.gateway': 'stripe',
          'payment.amount': amount,
        });

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100));
        return true;
      },
      { kind: SpanKind.CLIENT }
    );
  }
}

// ============================================================
// 3. Automatic Tracing with @Traced Decorator
// ============================================================

@Injectable()
class InventoryService {
  private readonly logger = new ObservabilityLogger('InventoryService');

  /**
   * Check stock - automatically traced
   */
  @Traced() // Uses class.method as span name
  async checkStock(productId: string): Promise<number> {
    this.logger.logWithData('Checking stock', { productId });

    // Add attributes to current span
    const tracer = new Tracer();
    tracer.setAttribute('product.id', productId);

    // Simulate database query (auto-instrumented)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const stock = Math.floor(Math.random() * 100);
    tracer.setAttribute('inventory.stock', stock);

    return stock;
  }

  /**
   * Reserve items - custom span name
   */
  @Traced('ReserveInventory')
  async reserveItems(productId: string, quantity: number): Promise<boolean> {
    const tracer = new Tracer();
    tracer.setAttributes({
      'product.id': productId,
      'inventory.quantity': quantity,
    });

    this.logger.logWithData('Reserving items', { productId, quantity });

    // Add event
    tracer.addEvent('inventory.reserved', {
      'product.id': productId,
      quantity: quantity,
    });

    return true;
  }
}

// ============================================================
// 4. Business Metrics Recording
// ============================================================

@Injectable()
class MetricsExample {
  constructor(private readonly businessMetrics: BusinessMetrics) {}

  async demonstrateMetrics() {
    // Record command execution
    this.businessMetrics.recordCommandExecution('CreateOrder', 150, true);

    // Record query execution
    this.businessMetrics.recordQueryExecution('GetOrderById', 25, true);

    // Record event publishing
    this.businessMetrics.recordEventPublished('OrderCreated');

    // Record event processing
    this.businessMetrics.recordEventProcessed('OrderCreated', true);

    // Record saga execution
    this.businessMetrics.recordSagaStarted('OrderSaga');
    this.businessMetrics.recordSagaCompleted('OrderSaga', true, 500);

    // Record outbox metrics
    this.businessMetrics.recordOutboxMessagePublished('OrderCreated', true);
    this.businessMetrics.recordOutboxBacklogSize(10);

    // Record cache metrics
    this.businessMetrics.recordCacheHit('order:123');
    this.businessMetrics.recordCacheMiss('order:456');

    // Record circuit breaker state
    this.businessMetrics.recordCircuitBreakerStateChange(
      'payment-service',
      'open'
    );
  }
}

// ============================================================
// 5. Custom Metrics with MetricsManager
// ============================================================

@Injectable()
class CustomMetrics {
  constructor(private readonly metricsManager: MetricsManager) {}

  recordCustomMetrics() {
    // Counter - always increasing
    this.metricsManager.incrementCounter('orders.created.total', 1, {
      payment_method: 'credit_card',
      region: 'us-east-1',
    });

    // Histogram - record durations/sizes
    this.metricsManager.recordHistogram('order.processing.duration.ms', 250, {
      status: 'success',
    });

    // Up/Down Counter - can increase or decrease
    this.metricsManager.addToUpDownCounter('active.connections', 1);
    this.metricsManager.addToUpDownCounter('active.connections', -1);

    // Observable Gauge - sample a value periodically
    this.metricsManager.createObservableGauge(
      'memory.heap.used.bytes',
      () => {
        return process.memoryUsage().heapUsed;
      },
      {
        description: 'Current heap memory usage in bytes',
        unit: 'bytes',
      }
    );
  }

  /**
   * Measure execution time automatically
   */
  async processWithTiming() {
    await this.metricsManager.measureTime(
      'data.processing.duration.ms',
      async () => {
        // Your logic here
        await new Promise((resolve) => setTimeout(resolve, 100));
      },
      {
        operation: 'transform',
      }
    );
  }
}

// ============================================================
// 6. Structured Logging with Trace Context
// ============================================================

@Injectable()
class LoggingExample {
  private readonly logger = new ObservabilityLogger('LoggingExample');

  demonstrateLogging() {
    // Standard logging (delegates to NestJS Logger)
    this.logger.log('Application started', 'Bootstrap');
    this.logger.error('Something went wrong', 'stack trace', 'ErrorContext');

    // Enhanced logging with structured data and trace context
    this.logger.logWithData('Processing order', {
      orderId: 'order-123',
      userId: 'user-456',
      amount: 99.99,
    });

    // Error logging with exception and context
    try {
      throw new Error('Payment failed');
    } catch (error) {
      this.logger.errorWithData(
        'Payment processing failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          orderId: 'order-123',
          paymentMethod: 'credit_card',
        }
      );
    }

    // Debug logging with context
    this.logger.debugWithData('Cache lookup', {
      key: 'order:123',
      hit: true,
      ttl: 3600,
    });

    // When inside a span, logs will include trace_id and span_id
    const tracer = new Tracer();
    tracer.withSpan('ProcessOrder', async () => {
      // This log will include [trace_id=...] [span_id=...]
      this.logger.logWithData('Order validated', {
        orderId: 'order-123',
      });
    });
  }
}

// ============================================================
// 7. Module Configuration
// ============================================================

@Module({
  imports: [
    // Import ObservabilityModule globally
    ObservabilityModule.forRoot({
      serviceName: 'order-service',
      serviceVersion: '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      traceExporterUrl: process.env['OTEL_TRACE_ENDPOINT'],
      metricsExporterUrl: process.env['OTEL_METRICS_ENDPOINT'],
      autoInstrumentation: true,
      global: true, // Make available globally
    }),
  ],
  providers: [
    OrderService,
    InventoryService,
    MetricsExample,
    CustomMetrics,
    LoggingExample,
  ],
})
export class AppModule {}

// ============================================================
// 8. Main Application Setup
// ============================================================

async function bootstrap() {
  // Initialize OpenTelemetry BEFORE creating NestJS app
  const sdk = initializeObservability();

  // Your NestJS bootstrap code here
  // const app = await NestFactory.create(AppModule);
  // await app.listen(3000);

  // Clean shutdown
  process.on('SIGTERM', async () => {
    await sdk.shutdown();
    // await app.close();
  });
}

// ============================================================
// Expected Output Examples
// ============================================================

/**
 * JAEGER TRACE VIEW:
 *
 * OrderService.createOrder (200ms)
 *   ├─ InventoryService.checkStock (50ms)
 *   ├─ OrderService.processPayment (150ms)
 *   │  └─ PaymentGateway.charge (100ms)
 *   └─ EventStore.append (25ms)
 *
 * Each span shows:
 * - Duration
 * - Attributes (user.id, order.id, etc.)
 * - Events (order.created, payment.processed)
 * - Status (OK/ERROR)
 */

/**
 * LOG OUTPUT:
 *
 * [2024-01-15T10:30:45.123Z] LOG Creating order [trace_id=abc123...] [span_id=def456...] {"userId":"user-123","itemsCount":3}
 * [2024-01-15T10:30:45.273Z] LOG Order created successfully [trace_id=abc123...] [span_id=def456...] {"orderId":"order-789","userId":"user-123"}
 */

/**
 * PROMETHEUS METRICS:
 *
 * commands_executed_total{command="CreateOrder",success="true"} 150
 * commands_duration_ms_bucket{command="CreateOrder",le="100"} 50
 * events_published_total{event_type="OrderCreated"} 200
 * cache_hits_total{cache_key="order:123"} 1000
 * circuit_breaker_state_changes_total{circuit="payment-service",state="open"} 5
 */

export {
  bootstrap,
  OrderService,
  InventoryService,
  MetricsExample,
  CustomMetrics,
  LoggingExample,
};
