import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  CqrsModule,
  EventStoreModule,
  OutboxModule,
  MessagingModule,
  MESSAGE_PUBLISHER,
  EventBufferModule,
} from '@flexobo/core';
import {
  HealthModule,
  ObservabilityModule,
  PostgreSQLHealthIndicator,
  JwtAuthGuard,
  GrpcTokenValidator,
  TOKEN_VALIDATOR,
  USERS_GRPC_CLIENT,
} from '@flexobo/shared-kernel';
import { PrismaModule } from './prisma.module';

// Controllers
import { FileController } from './adapters/http/v1/file.controller';

// Ports
import { FILE_AGGREGATE_STORE } from './ports/file-store.port';
import { FILE_READ_MODEL_REPOSITORY } from './ports/file-read-model.port';
import { STORAGE_SERVICE } from './ports/storage.port';

// Adapters
import { FileAggregateStore } from './adapters/persistence/file-aggregate.store';
import { PrismaFileReadModelRepository } from './adapters/persistence/prisma-file-read-model.repository';
import { S3StorageService } from './adapters/services/s3-storage.service';
import { FileProjection } from './adapters/eventbus/projection/file.projection';

// Command Handlers
import {
  UploadFileHandler,
  DeleteFileHandler,
  UploadChatFileHandler,
} from './application/commands/file.handlers';

// Query Handlers
import {
  GetFileByIdHandler,
  GetFilesByUserHandler,
  GetFilesByCompanyHandler,
  GetStorageStatsHandler,
  GetDownloadUrlHandler,
} from './application/queries/file.handlers';

const CommandHandlers = [UploadFileHandler, DeleteFileHandler, UploadChatFileHandler];

const QueryHandlers = [
  GetFileByIdHandler,
  GetFilesByUserHandler,
  GetFilesByCompanyHandler,
  GetStorageStatsHandler,
  GetDownloadUrlHandler,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

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
          ttl: 86400000 * 7, // 7 days
        },
        logging: { enabled: true, level: 'info' },
      },
      enablePublisher: true,
      enableConsumer: true,
    }),

    CqrsModule.forRoot({
      commandHandlers: CommandHandlers,
      queryHandlers: QueryHandlers,
    }),

    OutboxModule.forRoot({
      workerConfig: {
        pollingIntervalMs: 500,
        batchSize: 500,
        enabled: true,
      },
      messagePublisher: {
        provide: 'IMessagePublisher',
        useExisting: MESSAGE_PUBLISHER,
      },
    }),

    EventBufferModule.forRoot({
      redis: process.env['REDIS_URL'] || 'redis://localhost:6379',
      config: {
        prefix: 'file:evtbuf',
        eventTtl: 600,
        lockTtlMs: 5000,
      },
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
      serviceName: 'file-service',
      serviceVersion: '1.0.0',
      environment: process.env['NODE_ENV'],
      traceExporterUrl: process.env['OTEL_TRACE_ENDPOINT'],
      metricsExporterUrl: process.env['OTEL_METRICS_ENDPOINT'],
      autoInstrumentation: true,
      global: true,
    }),
  ],
  controllers: [FileController],
  providers: [
    // Aggregate Store
    { provide: FILE_AGGREGATE_STORE, useClass: FileAggregateStore },

    // Read Model Repository
    { provide: FILE_READ_MODEL_REPOSITORY, useClass: PrismaFileReadModelRepository },

    // Storage Service (S3)
    { provide: STORAGE_SERVICE, useClass: S3StorageService },

    // Projections
    FileProjection,

    // Command Handlers
    ...CommandHandlers,

    // Query Handlers
    ...QueryHandlers,

    // Auth (from shared-kernel)
    GrpcTokenValidator,
    { provide: TOKEN_VALIDATOR, useExisting: GrpcTokenValidator },
    JwtAuthGuard,
  ],
})
export class FileModule {}
