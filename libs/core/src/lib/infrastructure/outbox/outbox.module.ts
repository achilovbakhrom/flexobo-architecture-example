import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { OutboxService, OutboxServiceConfig } from './outbox.service';
import { OutboxWorker, OutboxWorkerConfig } from './outbox.worker';
import { PrismaOutboxRepository } from './prisma-outbox.repository';
import { IOutboxRepository } from './outbox-message.interface';
import { IMessagePublisher } from '../messaging/message-publisher.interface';

/**
 * Options for configuring the OutboxModule
 */
export interface OutboxModuleOptions {
  /**
   * Prisma client instance to use for database operations.
   * If not provided, a new PrismaClient will be created.
   */
  prismaClient?: PrismaClient;

  /**
   * Configuration for outbox service
   */
  serviceConfig?: OutboxServiceConfig;

  /**
   * Configuration for outbox worker
   */
  workerConfig?: OutboxWorkerConfig;

  /**
   * Message publisher implementation
   * Must be provided for the worker to publish messages
   */
  messagePublisher?: Provider;
}

/**
 * Module that provides transactional outbox pattern implementation.
 *
 * The outbox pattern ensures reliable event publishing by:
 * 1. Storing events in the database within the same transaction as domain changes
 * 2. Having a background worker poll and publish events to message broker
 * 3. Retrying failed messages with exponential backoff
 * 4. Cleaning up old published messages
 *
 * @example
 * ```typescript
 * // In your app module
 * @Module({
 *   imports: [
 *     OutboxModule.forRoot({
 *       prismaClient: prismaService,
 *       serviceConfig: { maxRetries: 5 },
 *       workerConfig: {
 *         pollingIntervalMs: 1000,
 *         batchSize: 100,
 *         concurrency: 10
 *       },
 *       messagePublisher: {
 *         provide: 'IMessagePublisher',
 *         useClass: RabbitMQPublisher
 *       }
 *     })
 *   ]
 * })
 * export class AppModule {}
 *
 * // In your service
 * @Injectable()
 * export class TruckService {
 *   constructor(
 *     @Inject('IEventStore') private readonly eventStore: IEventStore,
 *     private readonly outboxService: OutboxService
 *   ) {}
 *
 *   async createTruck(command: CreateTruckCommand): Promise<void> {
 *     // Within a transaction:
 *     // 1. Apply domain changes
 *     const truck = Truck.create(command);
 *
 *     // 2. Save events to event store
 *     await this.eventStore.append(
 *       truck.id,
 *       truck.getUncommittedEvents(),
 *       0
 *     );
 *
 *     // 3. Save events to outbox (same transaction)
 *     await this.outboxService.saveEvents(
 *       truck.getUncommittedEvents(),
 *       truck.id,
 *       'Truck',
 *       command.companyId
 *     );
 *   }
 * }
 * ```
 */
@Module({})
export class OutboxModule {
  /**
   * Register OutboxModule with configuration options
   */
  static forRoot(options: OutboxModuleOptions = {}): DynamicModule {
    const { prismaClient, serviceConfig, workerConfig, messagePublisher } =
      options;

    const providers: Provider[] = [
      // Provide PrismaClient
      {
        provide: PrismaClient,
        useValue: prismaClient || new PrismaClient(),
      },
      // Provide IOutboxRepository implementation
      {
        provide: 'IOutboxRepository',
        useClass: PrismaOutboxRepository,
      },
      // Provide OutboxService
      {
        provide: OutboxService,
        useFactory: (repository: IOutboxRepository) => {
          return new OutboxService(repository, serviceConfig);
        },
        inject: ['IOutboxRepository'],
      },
    ];

    // Add worker if message publisher is provided
    if (messagePublisher) {
      providers.push(messagePublisher, {
        provide: OutboxWorker,
        useFactory: (
          outboxService: OutboxService,
          publisher: IMessagePublisher
        ) => {
          return new OutboxWorker(outboxService, publisher, workerConfig);
        },
        inject: [
          OutboxService,
          typeof messagePublisher === 'object' && 'provide' in messagePublisher
            ? messagePublisher.provide
            : 'IMessagePublisher',
        ],
      });
    }

    return {
      module: OutboxModule,
      providers,
      exports: [OutboxService, 'IOutboxRepository', OutboxWorker],
      global: true, // Make outbox available globally
    };
  }

  /**
   * Register OutboxModule for feature modules (async configuration)
   */
  static forRootAsync(options: {
    useFactory: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => Promise<OutboxModuleOptions> | OutboxModuleOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    return {
      module: OutboxModule,
      providers: [
        {
          provide: 'OUTBOX_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: 'IOutboxRepository',
          useClass: PrismaOutboxRepository,
        },
        OutboxService,
      ],
      exports: [OutboxService, 'IOutboxRepository'],
      global: true,
    };
  }
}
