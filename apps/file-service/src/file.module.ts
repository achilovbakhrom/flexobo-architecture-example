import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  CqrsModule,
  EventStoreModule,
  OutboxModule,
  MessagingModule,
  MESSAGE_PUBLISHER,
} from '@flexobo/core';
import {
  HealthModule,
  ObservabilityModule,
  PostgreSQLHealthIndicator,
} from '@flexobo/shared-kernel';
import { AuthModule } from '@flexobo/shared-kernel';
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
          process.env['JWT_SECRET'] ||
          'your-secret-key-change-in-production',
        accessTokenExpiry: 900, // 15 minutes
        refreshTokenExpiry: 604800, // 7 days
      },
      globalGuard: false,
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
  ],
})
export class FileModule {}
