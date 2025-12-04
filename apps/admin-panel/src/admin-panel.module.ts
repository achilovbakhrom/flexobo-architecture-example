/**
 * Admin Panel Module
 *
 * Includes inventory management with event sourcing and
 * cross-service communication with Order Service via RabbitMQ.
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  CqrsModule,
  EventStoreModule,
  OutboxModule,
  MessagingModule,
  MESSAGE_PUBLISHER,
} from '@flexobo/core';
import { AuthModule } from '@flexobo/shared-kernel';
import { PrismaModule } from './prisma.module';

import { HealthController } from './presentation/health.controller';
import { UserController } from './presentation/user.controller';
import { AuditLogController } from './presentation/audit-log.controller';
import {
  MetricsController,
  CacheController,
} from './presentation/metrics.controller';
import { InventoryController } from './presentation/inventory.controller';

import {
  UserManagementService,
  UserRepository,
} from './application/user-management.service';
import {
  AuditLogService,
  AuditLogRepository,
} from './application/audit-log.service';
import { SystemMetricsService } from './application/system-metrics.service';

import {
  CreateInventoryHandler,
  AddStockHandler,
  ReserveStockHandler,
  ReserveStockByProductHandler,
  ConfirmReservationHandler,
  ReleaseReservationHandler,
  ReleaseReservationByOrderHandler,
} from './application/commands/inventory.handlers';

import { INVENTORY_EVENT_REPOSITORY } from './ports/inventory.repository.port';
import { INVENTORY_READ_MODEL_REPOSITORY } from './ports/inventory-read-model.port';

import { EventSourcedInventoryRepository } from './adapters/persistence/event-sourced-inventory.repository';
import { PrismaInventoryReadModelRepository } from './adapters/persistence/prisma-inventory-read-model.repository';

import { OrderEventHandler } from './adapters/messaging/order-event.handler';

import { InventoryProjectionHandler } from './adapters/projection/inventory.projection';

@Module({
  imports: [
    PrismaModule,

    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),

    EventStoreModule.forRoot({
      enableUpcasting: false,
    }),

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
          ttl: 86400000 * 7,
        },
        logging: {
          enabled: true,
          level: 'info',
        },
      },
      enablePublisher: true,
      enableConsumer: true,
    }),

    CqrsModule.forRoot({
      commandHandlers: [
        CreateInventoryHandler,
        AddStockHandler,
        ReserveStockHandler,
        ReserveStockByProductHandler,
        ConfirmReservationHandler,
        ReleaseReservationHandler,
        ReleaseReservationByOrderHandler,
      ],
      queryHandlers: [],
    }),

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

    AuthModule.forRoot({
      jwt: {
        secret:
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        accessTokenExpiry: 900,
        refreshTokenExpiry: 604800,
      },
      globalGuard: false,
    }),
  ],
  controllers: [
    HealthController,
    UserController,
    AuditLogController,
    MetricsController,
    CacheController,
    InventoryController,
  ],
  providers: [
    UserManagementService,
    AuditLogService,
    SystemMetricsService,

    UserRepository,
    AuditLogRepository,

    {
      provide: INVENTORY_EVENT_REPOSITORY,
      useClass: EventSourcedInventoryRepository,
    },
    {
      provide: INVENTORY_READ_MODEL_REPOSITORY,
      useClass: PrismaInventoryReadModelRepository,
    },

    OrderEventHandler,

    InventoryProjectionHandler,

    CreateInventoryHandler,
    AddStockHandler,
    ReserveStockHandler,
    ReserveStockByProductHandler,
    ConfirmReservationHandler,
    ReleaseReservationHandler,
    ReleaseReservationByOrderHandler,
  ],
})
export class AdminPanelModule {}
