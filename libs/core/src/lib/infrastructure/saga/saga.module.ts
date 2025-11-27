import { DynamicModule, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  PrismaSagaRepository,
  SAGA_PRISMA_CLIENT,
} from './prisma-saga.repository';

export const SAGA_REPOSITORY = 'SAGA_REPOSITORY';

@Module({})
export class SagaModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static forRoot(options?: { prismaClient?: any }): DynamicModule {
    const prismaProvider = {
      provide: SAGA_PRISMA_CLIENT,
      useValue: options?.prismaClient,
    };

    const repositoryProvider = {
      provide: SAGA_REPOSITORY,
      useClass: PrismaSagaRepository,
    };

    return {
      module: SagaModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [prismaProvider, repositoryProvider],
      exports: [SAGA_REPOSITORY, SAGA_PRISMA_CLIENT],
      global: true,
    };
  }

  static forRootAsync(options: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useFactory: (...args: any[]) => Promise<{ prismaClient?: any }> | { prismaClient?: any };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    const optionsProvider = {
      provide: 'SAGA_MODULE_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const prismaProvider = {
      provide: SAGA_PRISMA_CLIENT,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useFactory: (config: { prismaClient?: any }) => config.prismaClient,
      inject: ['SAGA_MODULE_OPTIONS'],
    };

    const repositoryProvider = {
      provide: SAGA_REPOSITORY,
      useClass: PrismaSagaRepository,
    };

    return {
      module: SagaModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [optionsProvider, prismaProvider, repositoryProvider],
      exports: [SAGA_REPOSITORY, SAGA_PRISMA_CLIENT],
      global: true,
    };
  }
}
