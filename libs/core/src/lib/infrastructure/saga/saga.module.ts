import { DynamicModule, Module, Provider } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  PrismaSagaRepository,
  SAGA_PRISMA_CLIENT,
} from './prisma-saga.repository';
import {
  RedisSagaRepository,
  REDIS_SAGA_REPOSITORY,
} from './redis-saga.repository';
import { CACHE_SERVICE } from '../cache/cache.module';

export const SAGA_REPOSITORY = Symbol('SAGA_REPOSITORY');

export type SagaStorageType = 'prisma' | 'redis';

export interface SagaModuleOptions {
  /**
   * Storage type: 'prisma' for PostgreSQL, 'redis' for Redis
   * Default: 'redis'
   */
  storage?: SagaStorageType;

  /**
   * Prisma client (required if storage is 'prisma')
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaClient?: any;
}

@Module({})
export class SagaModule {
  static forRoot(options: SagaModuleOptions = {}): DynamicModule {
    const storage = options.storage ?? 'redis';
    const providers: Provider[] = [];
    const moduleExports: symbol[] = [SAGA_REPOSITORY];

    if (storage === 'prisma') {
      providers.push({
        provide: SAGA_PRISMA_CLIENT,
        useValue: options.prismaClient,
      });
      providers.push({
        provide: SAGA_REPOSITORY,
        useClass: PrismaSagaRepository,
      });
      moduleExports.push(SAGA_PRISMA_CLIENT);
    } else {
      // Redis storage (default)
      providers.push({
        provide: SAGA_REPOSITORY,
        useClass: RedisSagaRepository,
      });
      providers.push({
        provide: REDIS_SAGA_REPOSITORY,
        useClass: RedisSagaRepository,
      });
      moduleExports.push(REDIS_SAGA_REPOSITORY);
    }

    return {
      module: SagaModule,
      imports: [EventEmitterModule.forRoot()],
      providers,
      exports: moduleExports,
      global: true,
    };
  }

  static forRootAsync(options: {
    useFactory: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => Promise<SagaModuleOptions> | SagaModuleOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    const optionsProvider: Provider = {
      provide: 'SAGA_MODULE_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const repositoryProvider: Provider = {
      provide: SAGA_REPOSITORY,
      useFactory: (config: SagaModuleOptions, cache?: unknown) => {
        if (config.storage === 'prisma') {
          return new PrismaSagaRepository(config.prismaClient);
        }
        // Redis is default
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new RedisSagaRepository(cache as any);
      },
      inject: ['SAGA_MODULE_OPTIONS', { token: CACHE_SERVICE, optional: true }],
    };

    return {
      module: SagaModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [optionsProvider, repositoryProvider],
      exports: [SAGA_REPOSITORY],
      global: true,
    };
  }
}
