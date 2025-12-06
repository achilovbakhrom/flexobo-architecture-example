import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import {
  CqrsModule,
  MessagingModule,
  EventStoreModule,
  OutboxModule,
  MESSAGE_PUBLISHER,
  EventBufferModule,
} from '@flexobo/core';
import {
  JwtAuthGuard,
  GrpcTokenValidator,
  TOKEN_VALIDATOR,
  USERS_GRPC_CLIENT,
} from '@flexobo/shared-kernel';
import { PrismaModule, PRISMA_CLIENT } from './prisma.module';
import configuration from './config/configuration';

// Ports
import {
  NOTIFICATION_AGGREGATE_STORE,
  NOTIFICATION_READ_REPOSITORY,
} from './ports/notification.repository';
import { DEVICE_TOKEN_REPOSITORY } from './ports/device-token.repository';
import { PUSH_SERVICE } from './ports/push-service.port';
import { SSE_MANAGER } from './ports/sse-service.port';
import { EMAIL_SERVICE } from './ports/email-service.port';
import { SMS_SERVICE } from './ports/sms-service.port';

// Adapters - Persistence
import {
  PrismaNotificationReadRepository,
  PrismaDeviceTokenRepository,
  NotificationAggregateStore,
} from './adapters/persistence';

// Adapters - Push
import { FCMPushService } from './adapters/push/fcm-push.service';

// Adapters - Email
import { EmailService } from './adapters/email/email.service';

// Adapters - SMS
import { SmsService } from './adapters/sms/sms.service';

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
    ClientsModule.registerAsync([
      {
        name: USERS_GRPC_CLIENT,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'users',
            protoPath: require('path').join(
              process.cwd(),
              'libs/shared-kernel/src/lib/grpc/proto/users.proto'
            ),
            url: configService.get('USERS_GRPC_URL', 'localhost:50052'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
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
    EventStoreModule.forRoot({ prismaClientToken: PRISMA_CLIENT, enableUpcasting: false }),
    OutboxModule.forRoot({
      prismaClientToken: PRISMA_CLIENT,
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret', 'your-super-secret-jwt-key'),
        signOptions: {
          expiresIn: configService.get('jwt.accessTokenExpiry', '15m'),
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
    SSEManagerService,
    {
      provide: SSE_MANAGER,
      useExisting: SSEManagerService,
    },

    // Email
    {
      provide: EMAIL_SERVICE,
      useClass: EmailService,
    },
    EmailService,

    // SMS
    {
      provide: SMS_SERVICE,
      useClass: SmsService,
    },
    SmsService,

    // Projections
    NotificationProjection,

    // Event handlers
    ExternalEventHandler,

    // Command & Query handlers need to be provided for DI
    ...CommandHandlers,
    ...QueryHandlers,

    // Auth (from shared-kernel)
    GrpcTokenValidator,
    { provide: TOKEN_VALIDATOR, useExisting: GrpcTokenValidator },
    JwtAuthGuard,
  ],
})
export class NotificationModule {}
