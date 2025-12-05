import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  CqrsModule,
  MessagingModule,
  EventStoreModule,
  OutboxModule,
  MESSAGE_PUBLISHER,
  EventBufferModule,
} from '@flexobo/core';
import { PrismaModule } from './prisma.module';
import configuration from './config/configuration';

// Ports
import {
  NOTIFICATION_AGGREGATE_STORE,
  NOTIFICATION_READ_REPOSITORY,
} from './ports/notification.repository';
import { DEVICE_TOKEN_REPOSITORY } from './ports/device-token.repository';
import { PUSH_SERVICE } from './ports/push-service.port';
import { SSE_MANAGER } from './ports/sse-service.port';

// Adapters - Persistence
import {
  PrismaNotificationReadRepository,
  PrismaDeviceTokenRepository,
  NotificationAggregateStore,
} from './adapters/persistence';

// Adapters - Push
import { FCMPushService } from './adapters/push/fcm-push.service';

// Adapters - SSE
import { SSEController, SSEManagerService } from './adapters/sse';

// Adapters - HTTP
import { NotificationController } from './adapters/http/notification.controller';

// Adapters - Eventbus
import { NotificationProjection } from './adapters/eventbus/projection/notification.projection';
import { ExternalEventHandler } from './adapters/eventbus/external-event.handler';

// Command Handlers
import { CommandHandlers } from './application/commands';

// Query Handlers
import { QueryHandlers } from './application/queries';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    MessagingModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        config: {
          url: configService.get('rabbitmq.url', 'amqp://localhost:5672'),
          exchange: configService.get('rabbitmq.exchange', 'flexobo.events'),
          retry: {
            backoffMultiplier: 1,
            maxRetries: 10,
            initialDelayMs: 1000,
            maxDelayMs: 30000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    CqrsModule.forRoot({
      commandHandlers: CommandHandlers,
      queryHandlers: QueryHandlers,
    }),
    EventStoreModule.forRoot({ enableUpcasting: false }),
    OutboxModule.forRoot({
      workerConfig: { pollingIntervalMs: 500, batchSize: 500, enabled: true },
      messagePublisher: {
        provide: 'IMessagePublisher',
        useExisting: MESSAGE_PUBLISHER,
      },
    }),
    EventBufferModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: configService.get('redis.url', 'redis://localhost:6379'),
        config: {
          prefix: 'notification:evtbuf',
          eventTtl: 600,
          lockTtlMs: 5000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController, SSEController],
  providers: [
    // Repositories
    {
      provide: NOTIFICATION_AGGREGATE_STORE,
      useClass: NotificationAggregateStore,
    },
    {
      provide: NOTIFICATION_READ_REPOSITORY,
      useClass: PrismaNotificationReadRepository,
    },
    {
      provide: DEVICE_TOKEN_REPOSITORY,
      useClass: PrismaDeviceTokenRepository,
    },

    // Services
    {
      provide: PUSH_SERVICE,
      useClass: FCMPushService,
    },
    {
      provide: SSE_MANAGER,
      useClass: SSEManagerService,
    },
    SSEManagerService,

    // Projections
    NotificationProjection,

    // Event handlers
    ExternalEventHandler,

    // Command & Query handlers need to be provided for DI
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class NotificationModule {}
