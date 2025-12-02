import { Module } from '@nestjs/common';
import { CqrsModule, EventStoreModule, OutboxModule, MessagingModule, MESSAGE_PUBLISHER } from '@flexobo/core';
import {
  CacheModule,
  VersioningModule,
  VersioningStrategy,
  VersionStatus,
  HealthModule,
  ObservabilityModule,
  PostgreSQLHealthIndicator,
} from '@flexobo/shared-kernel';
import { PrismaModule } from './prisma.module';

import { OrderController } from './adapters/http/v1/order.controller';
import { ProductController } from './adapters/http/v1/product.controller';
import { PaymentController } from './adapters/http/v1/payment.controller';
import { OrderHistoryController } from './adapters/http/v1/order-history.controller';
import { TestController } from './adapters/http/v1/test.controller';

import { ORDER_AGGREGATE_STORE } from './ports/order-store.port';
import { ORDER_READ_MODEL_REPOSITORY } from './ports/order-read-model.port';
import { PRODUCT_EVENT_REPOSITORY, PRODUCT_READ_MODEL_REPOSITORY } from './ports/product.repository.port';
import { PAYMENT_AGGREGATE_STORE } from './ports/payment-store.port';
import { PAYMENT_READ_MODEL_REPOSITORY } from './ports/payment.repository.port';
import { ORDER_HISTORY_REPOSITORY } from './ports/order-history.repository.port';
import { DEAD_LETTER_REPOSITORY } from './ports/dead-letter.repository.port';

import { OrderAggregateStore } from './adapters/persistence/order-aggregate.store';
import { PrismaOrderReadModelRepository } from './adapters/persistence/prisma-order-read-model.repository';
import { EventSourcedProductRepository } from './adapters/persistence/event-sourced-product.repository';
import { PrismaProductReadModelRepository } from './adapters/persistence/prisma-product-read-model.repository';
import { PaymentAggregateStore } from './adapters/persistence/payment-aggregate.store';
import { PrismaPaymentReadModelRepository } from './adapters/persistence/prisma-payment-read-model.repository';
import { PrismaOrderHistoryRepository } from './adapters/persistence/prisma-order-history.repository';
import { PrismaDeadLetterRepository } from './adapters/persistence/prisma-dead-letter.repository';

import {
  OnOrderEventsHandler,
  OnPaymentEventsHandler,
  OnInventoryEventsHandler,
  DeadLetterHandler,
  OrderProjection,
  PaymentProjection,
  ProductProjection,
  OrderHistoryProjection,
} from './adapters/eventbus';

import {
  CreateOrderHandler,
  AddOrderItemHandler,
  ConfirmOrderHandler,
  CancelOrderHandler,
  ShipOrderHandler,
  MarkInventoryReservedHandler,
  MarkInventoryFailedHandler,
  MarkOrderPaidHandler,
  RecordPaymentFailedHandler,
} from './application/commands/order.handlers';

import {
  CreateProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  UpdateProductStockHandler,
} from './application/commands/product.handlers';

import {
  CreatePaymentHandler,
  ProcessPaymentHandler,
  CompletePaymentHandler,
  FailPaymentHandler,
  RefundPaymentHandler,
} from './application/commands/payment.handlers';

import {
  GetOrderByIdHandler,
  GetOrdersByUserHandler,
  GetRecentOrdersHandler,
  GetAllOrdersHandler,
} from './application/queries/order.handlers';

import {
  GetProductByIdHandler,
  GetProductBySkuHandler,
  GetProductsByCategoryHandler,
  GetActiveProductsHandler,
  SearchProductsHandler,
} from './application/queries/product.handlers';

import {
  GetPaymentByIdHandler,
  GetPaymentsByOrderHandler,
  GetPaymentsByStatusHandler,
  GetPaymentByTransactionIdHandler,
} from './application/queries/payment.handlers';

import { CheckoutUseCase } from './application/use-cases/checkout.use-case';

@Module({
  imports: [
    PrismaModule,

    EventStoreModule.forRoot({ enableUpcasting: false }),

    MessagingModule.forRoot({
      config: {
        url: process.env['RABBITMQ_URL'],
        exchanges: [
          { name: 'flexobo.events', type: 'topic', durable: true },
          { name: 'flexobo.dlx', type: 'topic', durable: true },
        ],
        deadLetter: {
          exchange: 'flexobo.dlx',
          queue: 'flexobo.dead-letter',
          ttl: 86400000 * 7,
        },
        logging: { enabled: true, level: 'info' },
      },
      enablePublisher: true,
      enableConsumer: true,
    }),

    CqrsModule.forRoot({
      commandHandlers: [
        CreateOrderHandler,
        AddOrderItemHandler,
        ConfirmOrderHandler,
        CancelOrderHandler,
        ShipOrderHandler,
        MarkInventoryReservedHandler,
        MarkInventoryFailedHandler,
        MarkOrderPaidHandler,
        RecordPaymentFailedHandler,
        CreateProductHandler,
        UpdateProductHandler,
        DeleteProductHandler,
        UpdateProductStockHandler,
        CreatePaymentHandler,
        ProcessPaymentHandler,
        CompletePaymentHandler,
        FailPaymentHandler,
        RefundPaymentHandler,
      ],
      queryHandlers: [
        GetOrderByIdHandler,
        GetOrdersByUserHandler,
        GetRecentOrdersHandler,
        GetAllOrdersHandler,
        GetProductByIdHandler,
        GetProductBySkuHandler,
        GetProductsByCategoryHandler,
        GetActiveProductsHandler,
        SearchProductsHandler,
        GetPaymentByIdHandler,
        GetPaymentsByOrderHandler,
        GetPaymentsByStatusHandler,
        GetPaymentByTransactionIdHandler,
      ],
    }),

    OutboxModule.forRoot({
      workerConfig: { pollingIntervalMs: 5000, batchSize: 100, enabled: true },
      messagePublisher: { provide: 'IMessagePublisher', useExisting: MESSAGE_PUBLISHER },
    }),

    VersioningModule.forRoot({
      strategy: VersioningStrategy.URI,
      defaultVersion: '1.0.0',
      versions: [{ version: { major: 1, minor: 0, patch: 0 }, status: VersionStatus.STABLE, description: 'Initial release' }],
      global: true,
    }),

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

    ObservabilityModule.forRoot({
      serviceName: 'order-service',
      serviceVersion: '1.0.0',
      environment: process.env['NODE_ENV'],
      traceExporterUrl: process.env['OTEL_TRACE_ENDPOINT'],
      metricsExporterUrl: process.env['OTEL_METRICS_ENDPOINT'],
      autoInstrumentation: true,
      global: true,
    }),

    CacheModule.forRoot({
      redis: { url: process.env['REDIS_URL'] },
      cache: { prefix: 'order-service:', defaultTtl: 86400 * 7 },
    }),
  ],
  controllers: [
    OrderController,
    ProductController,
    PaymentController,
    OrderHistoryController,
    TestController,
  ],
  providers: [
    { provide: ORDER_AGGREGATE_STORE, useClass: OrderAggregateStore },
    { provide: ORDER_READ_MODEL_REPOSITORY, useClass: PrismaOrderReadModelRepository },
    { provide: PRODUCT_EVENT_REPOSITORY, useClass: EventSourcedProductRepository },
    { provide: PRODUCT_READ_MODEL_REPOSITORY, useClass: PrismaProductReadModelRepository },
    { provide: PAYMENT_AGGREGATE_STORE, useClass: PaymentAggregateStore },
    { provide: PAYMENT_READ_MODEL_REPOSITORY, useClass: PrismaPaymentReadModelRepository },
    { provide: ORDER_HISTORY_REPOSITORY, useClass: PrismaOrderHistoryRepository },
    { provide: DEAD_LETTER_REPOSITORY, useClass: PrismaDeadLetterRepository },

    OrderProjection,
    PaymentProjection,
    ProductProjection,
    OrderHistoryProjection,

    OnOrderEventsHandler,
    OnPaymentEventsHandler,
    OnInventoryEventsHandler,
    DeadLetterHandler,

    CheckoutUseCase,

    CreateOrderHandler,
    AddOrderItemHandler,
    ConfirmOrderHandler,
    CancelOrderHandler,
    ShipOrderHandler,
    MarkInventoryReservedHandler,
    MarkInventoryFailedHandler,
    MarkOrderPaidHandler,
    RecordPaymentFailedHandler,
    CreateProductHandler,
    UpdateProductHandler,
    DeleteProductHandler,
    UpdateProductStockHandler,
    CreatePaymentHandler,
    ProcessPaymentHandler,
    CompletePaymentHandler,
    FailPaymentHandler,
    RefundPaymentHandler,

    GetOrderByIdHandler,
    GetOrdersByUserHandler,
    GetRecentOrdersHandler,
    GetAllOrdersHandler,
    GetProductByIdHandler,
    GetProductBySkuHandler,
    GetProductsByCategoryHandler,
    GetActiveProductsHandler,
    SearchProductsHandler,
    GetPaymentByIdHandler,
    GetPaymentsByOrderHandler,
    GetPaymentsByStatusHandler,
    GetPaymentByTransactionIdHandler,
  ],
})
export class OrderModule {}
