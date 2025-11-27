import { DynamicModule, Module, Provider } from '@nestjs/common';
import { OutboxService, OutboxServiceConfig } from './outbox.service';
import { OutboxWorker, OutboxWorkerConfig } from './outbox.worker';
import {
  PrismaOutboxRepository,
  OUTBOX_PRISMA_CLIENT,
} from './prisma-outbox.repository';
import { IOutboxRepository } from './outbox-message.interface';
import { IMessagePublisher } from '../messaging/message-publisher.interface';

export interface OutboxModuleOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaClient?: any;
  serviceConfig?: OutboxServiceConfig;
  workerConfig?: OutboxWorkerConfig;
  messagePublisher?: Provider;
}

@Module({})
export class OutboxModule {
  static forRoot(options: OutboxModuleOptions = {}): DynamicModule {
    const { prismaClient, serviceConfig, workerConfig, messagePublisher } =
      options;

    const providers: Provider[] = [
      {
        provide: OUTBOX_PRISMA_CLIENT,
        useValue: prismaClient,
      },
      {
        provide: 'IOutboxRepository',
        useClass: PrismaOutboxRepository,
      },
      {
        provide: OutboxService,
        useFactory: (repository: IOutboxRepository) => {
          return new OutboxService(repository, serviceConfig);
        },
        inject: ['IOutboxRepository'],
      },
    ];

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
      exports: [
        OutboxService,
        'IOutboxRepository',
        ...(messagePublisher ? [OutboxWorker] : []),
      ],
      global: true,
    };
  }

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
