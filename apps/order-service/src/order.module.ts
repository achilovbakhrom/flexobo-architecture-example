/**
 * Order Service Module
 *
 * Hexagonal Architecture:
 * - Domain Layer: Pure business logic (aggregates)
 * - Application Layer: Use cases, commands, queries, DTOs
 * - Ports: Interfaces defining boundaries
 * - Adapters (by technology):
 *   - http/v1: REST controllers (API v1)
 *   - persistence: Repositories
 *   - queue: Event consumers (projections/read model updates)
 *   - cache: Redis cache (future)
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CqrsModule } from '@flexobo/core';
import { EventStoreModule } from '@flexobo/core';
import { OutboxModule } from '@flexobo/core';
import {
  MessagingModule,
  MESSAGE_PUBLISHER,
} from '@flexobo/core';
import {
  VersioningModule,
  VersioningStrategy,
  VersionStatus,
} from '@flexobo/core';
import { HealthModule } from '@flexobo/core';
import { ObservabilityModule } from '@flexobo/core';
import { PostgreSQLHealthIndicator } from '@flexobo/core';

// ============================================================
// HTTP Adapters (Controllers) - API v1
// ============================================================
import { OrderController } from './adapters/http/v1/order.controller';
import { ProductController } from './adapters/http/v1/product.controller';
import { PaymentController } from './adapters/http/v1/payment.controller';
import { OrderHistoryController } from './adapters/http/v1/order-history.controller';

// ============================================================
// Ports
// ============================================================
import { ORDER_EVENT_REPOSITORY } from './ports/order.repository.port';
import { ORDER_READ_MODEL_REPOSITORY } from './ports/order-read-model.port';
import {
  PRODUCT_EVENT_REPOSITORY,
  PRODUCT_READ_MODEL_REPOSITORY,
} from './ports/product.repository.port';
import {
  PAYMENT_EVENT_REPOSITORY,
  PAYMENT_READ_MODEL_REPOSITORY,
} from './ports/payment.repository.port';
import { ORDER_HISTORY_REPOSITORY } from './ports/order-history.repository.port';

// ============================================================
// Persistence Adapters (Repositories)
// ============================================================
import { EventSourcedOrderRepository } from './adapters/persistence/event-sourced-order.repository';
import { PrismaOrderReadModelRepository } from './adapters/persistence/prisma-order-read-model.repository';
import { EventSourcedProductRepository } from './adapters/persistence/event-sourced-product.repository';
import { PrismaProductReadModelRepository } from './adapters/persistence/prisma-product-read-model.repository';
import { EventSourcedPaymentRepository } from './adapters/persistence/event-sourced-payment.repository';
import { PrismaPaymentReadModelRepository } from './adapters/persistence/prisma-payment-read-model.repository';
import { PrismaOrderHistoryRepository } from './adapters/persistence/prisma-order-history.repository';

// ============================================================
// Queue Adapters (Event Consumers)
// ============================================================
import { OrderEventConsumer } from './adapters/queue/order-event.consumer';
import { PaymentEventConsumer } from './adapters/queue/payment-event.consumer';
import { OrderHistoryEventConsumer } from './adapters/queue/order-history-event.consumer';
import { ProductEventConsumer } from './adapters/queue/product-event.consumer';

// ============================================================
// Messaging Adapters (RabbitMQ Event Handlers)
// ============================================================
import { InventoryEventHandler } from './adapters/messaging/inventory-event.handler';

// ============================================================
// Order Command Handlers
// ============================================================
import {
  CreateOrderHandler,
  AddOrderItemHandler,
  ConfirmOrderHandler,
  CancelOrderHandler,
  ShipOrderHandler,
  MarkInventoryReservedHandler,
  MarkInventoryFailedHandler,
} from './application/commands/order.handlers';

// ============================================================
// Product Command Handlers
// ============================================================
import {
  CreateProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  UpdateProductStockHandler,
} from './application/commands/product.handlers';

// ============================================================
// Payment Command Handlers
// ============================================================
import {
  CreatePaymentHandler,
  ProcessPaymentHandler,
  CompletePaymentHandler,
  FailPaymentHandler,
  RefundPaymentHandler,
} from './application/commands/payment.handlers';

// ============================================================
// Order Query Handlers
// ============================================================
import {
  GetOrderByIdHandler,
  GetOrdersByUserHandler,
  GetRecentOrdersHandler,
} from './application/queries/order.handlers';

// ============================================================
// Product Query Handlers
// ============================================================
import {
  GetProductByIdHandler,
  GetProductBySkuHandler,
  GetProductsByCategoryHandler,
  GetActiveProductsHandler,
  SearchProductsHandler,
} from './application/queries/product.handlers';

// ============================================================
// Payment Query Handlers
// ============================================================
import {
  GetPaymentByIdHandler,
  GetPaymentsByOrderHandler,
  GetPaymentsByStatusHandler,
  GetPaymentByTransactionIdHandler,
} from './application/queries/payment.handlers';

// ============================================================
// Use Cases
// ============================================================
import { CheckoutUseCase } from './application/use-cases/checkout.use-case';

// ============================================================
// Sagas
// ============================================================
import { OrderFulfillmentSaga } from './application/sagas/order-fulfillment.saga';

@Module({
  imports: [
    // Event Emitter for projections
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),

    // Event Store for event sourcing (MUST be before CqrsModule)
    EventStoreModule.forRoot({
      enableUpcasting: false,
    }),

    // RabbitMQ Messaging for cross-service communication
    MessagingModule.forRoot({
      config: {
        url: process.env['RABBITMQ_URL'] || 'amqp://guest:guest@localhost:5672',
        exchanges: [
          { name: 'flexobo.events', type: 'topic', durable: true },
          { name: 'flexobo.dlx', type: 'topic', durable: true },
        ],
        deadLetter: {
          exchange: 'flexobo.dlx',
          queue: 'flexobo.dead-letter',
          ttl: 86400000 * 7, // 7 days
        },
        logging: {
          enabled: true,
          level: 'info',
        },
      },
      enablePublisher: true,
      enableConsumer: true,
    }),

    // Core CQRS infrastructure
    CqrsModule.forRoot({
      commandHandlers: [
        // Order commands
        CreateOrderHandler,
        AddOrderItemHandler,
        ConfirmOrderHandler,
        CancelOrderHandler,
        ShipOrderHandler,
        MarkInventoryReservedHandler,
        MarkInventoryFailedHandler,
        // Product commands
        CreateProductHandler,
        UpdateProductHandler,
        DeleteProductHandler,
        UpdateProductStockHandler,
        // Payment commands
        CreatePaymentHandler,
        ProcessPaymentHandler,
        CompletePaymentHandler,
        FailPaymentHandler,
        RefundPaymentHandler,
      ],
      queryHandlers: [
        // Order queries
        GetOrderByIdHandler,
        GetOrdersByUserHandler,
        GetRecentOrdersHandler,
        // Product queries
        GetProductByIdHandler,
        GetProductBySkuHandler,
        GetProductsByCategoryHandler,
        GetActiveProductsHandler,
        SearchProductsHandler,
        // Payment queries
        GetPaymentByIdHandler,
        GetPaymentsByOrderHandler,
        GetPaymentsByStatusHandler,
        GetPaymentByTransactionIdHandler,
      ],
    }),

    // Outbox pattern for reliable messaging (wired to RabbitMQ)
    OutboxModule.forRoot({
      workerConfig: {
        pollingIntervalMs: 5000,
        batchSize: 100,
        enabled: true,
      },
      messagePublisher: {
        provide: 'IMessagePublisher',
        useExisting: MESSAGE_PUBLISHER,
      },
    }),

    // API Versioning
    VersioningModule.forRoot({
      strategy: VersioningStrategy.URI,
      defaultVersion: '1.0.0',
      versions: [
        {
          version: { major: 1, minor: 0, patch: 0 },
          status: VersionStatus.STABLE,
          description: 'Initial release',
        },
      ],
      global: true,
    }),

    // Health Checks
    HealthModule.forRoot({
      version: '1.0.0',
      enableEndpoints: true,
      indicators: [],
      dependencies: [
        new PostgreSQLHealthIndicator(async (query: string) => {
          console.log('Health check query:', query);
          return [{ result: 1 }];
        }),
      ],
      global: true,
    }),

    // OpenTelemetry Observability
    ObservabilityModule.forRoot({
      serviceName: 'order-service',
      serviceVersion: '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      traceExporterUrl:
        process.env['OTEL_TRACE_ENDPOINT'] || 'http://localhost:4318/v1/traces',
      metricsExporterUrl:
        process.env['OTEL_METRICS_ENDPOINT'] ||
        'http://localhost:4318/v1/metrics',
      autoInstrumentation: true,
      global: true,
    }),
  ],
  controllers: [
    OrderController,
    ProductController,
    PaymentController,
    OrderHistoryController,
  ],
  providers: [
    // ============================================================
    // Order Repositories
    // ============================================================
    {
      provide: ORDER_EVENT_REPOSITORY,
      useClass: EventSourcedOrderRepository,
    },
    {
      provide: ORDER_READ_MODEL_REPOSITORY,
      useClass: PrismaOrderReadModelRepository,
    },

    // ============================================================
    // Product Repositories (Event-sourced + Read Model)
    // ============================================================
    {
      provide: PRODUCT_EVENT_REPOSITORY,
      useClass: EventSourcedProductRepository,
    },
    {
      provide: PRODUCT_READ_MODEL_REPOSITORY,
      useClass: PrismaProductReadModelRepository,
    },

    // ============================================================
    // Payment Repositories (Event-sourced + Read Model)
    // ============================================================
    {
      provide: PAYMENT_EVENT_REPOSITORY,
      useClass: EventSourcedPaymentRepository,
    },
    {
      provide: PAYMENT_READ_MODEL_REPOSITORY,
      useClass: PrismaPaymentReadModelRepository,
    },

    // ============================================================
    // Order History Repository (Audit Log)
    // ============================================================
    {
      provide: ORDER_HISTORY_REPOSITORY,
      useClass: PrismaOrderHistoryRepository,
    },

    // ============================================================
    // Queue Event Consumers - update read models from events
    // ============================================================
    OrderEventConsumer,
    ProductEventConsumer,
    PaymentEventConsumer,
    OrderHistoryEventConsumer,

    // ============================================================
    // Messaging Event Handlers - RabbitMQ cross-service handlers
    // ============================================================
    InventoryEventHandler,

    // ============================================================
    // Use Cases - orchestrate complex workflows
    // ============================================================
    CheckoutUseCase,

    // ============================================================
    // Sagas - coordinate long-running processes
    // ============================================================
    OrderFulfillmentSaga,
  ],
})
export class OrderModule {}
