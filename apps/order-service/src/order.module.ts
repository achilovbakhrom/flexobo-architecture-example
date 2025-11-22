/**
 * Order Service Module
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@flexobo/core';
import { EventStoreModule } from '@flexobo/core';
import { OutboxModule } from '@flexobo/core';
import {
  VersioningModule,
  VersioningStrategy,
  VersionStatus,
} from '@flexobo/core';
import { HealthModule } from '@flexobo/core';
import { ObservabilityModule } from '@flexobo/core';
import { PostgreSQLHealthIndicator } from '@flexobo/core';

import { OrderController } from './presentation/order.controller';

// Command handlers
import {
  CreateOrderHandler,
  AddOrderItemHandler,
  ConfirmOrderHandler,
  CancelOrderHandler,
  ShipOrderHandler,
} from './application/commands/order.handlers';

// Query handlers
import {
  GetOrderByIdHandler,
  GetOrdersByUserHandler,
  GetRecentOrdersHandler,
} from './application/queries/order.handlers';

@Module({
  imports: [
    // Core CQRS infrastructure
    CqrsModule.forRoot({
      commandHandlers: [
        CreateOrderHandler,
        AddOrderItemHandler,
        ConfirmOrderHandler,
        CancelOrderHandler,
        ShipOrderHandler,
      ],
      queryHandlers: [
        GetOrderByIdHandler,
        GetOrdersByUserHandler,
        GetRecentOrdersHandler,
      ],
    }),

    // Event Store for event sourcing
    EventStoreModule.forRoot({
      // PrismaClient will be created automatically
      enableUpcasting: false,
    }),

    // Outbox pattern for reliable messaging
    OutboxModule.forRoot({
      // PrismaClient will be created automatically
      workerConfig: {
        pollingIntervalMs: 5000,
        batchSize: 100,
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
          // Mock implementation - replace with actual Prisma client
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
  controllers: [OrderController],
  providers: [],
})
export class OrderModule {}
