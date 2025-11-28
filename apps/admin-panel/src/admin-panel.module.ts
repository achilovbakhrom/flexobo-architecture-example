/**
 * Admin Panel Module
 *
 * Includes inventory management with event sourcing and
 * cross-service communication with Order Service via RabbitMQ.
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  AuthModule,
  CqrsModule,
  EventStoreModule,
  OutboxModule,
  MessagingModule,
  MESSAGE_PUBLISHER,
} from '@flexobo/core';
import { PrismaModule } from './prisma.module';

// ============================================================
// Presentation Layer (Controllers)
// ============================================================
import { HealthController } from './presentation/health.controller';
import { UserController } from './presentation/user.controller';
import { AuditLogController } from './presentation/audit-log.controller';
import {
  MetricsController,
  CacheController,
} from './presentation/metrics.controller';
import { InventoryController } from './presentation/inventory.controller';

// ============================================================
// Application Services
// ============================================================
import {
  UserManagementService,
  UserRepository,
} from './application/user-management.service';
import {
  AuditLogService,
  AuditLogRepository,
} from './application/audit-log.service';
import { SystemMetricsService } from './application/system-metrics.service';

// ============================================================
// Inventory Command Handlers
// ============================================================
import {
  CreateInventoryHandler,
  AddStockHandler,
  ReserveStockHandler,
  ReserveStockByProductHandler,
  ConfirmReservationHandler,
  ReleaseReservationHandler,
  ReleaseReservationByOrderHandler,
} from './application/commands/inventory.handlers';

// ============================================================
// Ports
// ============================================================
import { INVENTORY_EVENT_REPOSITORY } from './ports/inventory.repository.port';
import { INVENTORY_READ_MODEL_REPOSITORY } from './ports/inventory-read-model.port';

// ============================================================
// Persistence Adapters
// ============================================================
import { EventSourcedInventoryRepository } from './adapters/persistence/event-sourced-inventory.repository';
import { PrismaInventoryReadModelRepository } from './adapters/persistence/prisma-inventory-read-model.repository';

// ============================================================
// Messaging Adapters (RabbitMQ Event Handlers)
// ============================================================
import { OrderEventHandler } from './adapters/messaging/order-event.handler';

// ============================================================
// Projection Handlers (Local Event Handlers for Read Model)
// ============================================================
import { InventoryProjectionHandler } from './adapters/projection/inventory.projection';

@Module({
  imports: [
    // Prisma ORM
    PrismaModule,

    // Event Emitter for local projections
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),

    // Event Store for event sourcing
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

    // Outbox pattern for reliable messaging
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

    // Import auth module with JWT configuration
    AuthModule.forRoot({
      jwt: {
        secret:
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        accessTokenExpiry: 900, // 15 minutes in seconds
        refreshTokenExpiry: 604800, // 7 days in seconds
      },
      globalGuard: false, // Use guards on specific controllers
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
    // ============================================================
    // Application Services
    // ============================================================
    UserManagementService,
    AuditLogService,
    SystemMetricsService,

    // ============================================================
    // Repositories (User/Audit)
    // ============================================================
    UserRepository,
    AuditLogRepository,

    // ============================================================
    // Inventory Repositories
    // ============================================================
    {
      provide: INVENTORY_EVENT_REPOSITORY,
      useClass: EventSourcedInventoryRepository,
    },
    {
      provide: INVENTORY_READ_MODEL_REPOSITORY,
      useClass: PrismaInventoryReadModelRepository,
    },

    // ============================================================
    // Messaging Event Handlers - RabbitMQ cross-service handlers
    // ============================================================
    OrderEventHandler,

    // ============================================================
    // Projection Handlers - Local event handlers for read model
    // ============================================================
    InventoryProjectionHandler,

    // ============================================================
    // Command Handlers (must be providers for DI resolution)
    // ============================================================
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
