import { DynamicModule, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaClient } from '@prisma/client';
import { PrismaSagaRepository } from './prisma-saga.repository';

export const SAGA_REPOSITORY = 'SAGA_REPOSITORY';
export const PRISMA_CLIENT = 'PRISMA_CLIENT';

/**
 * Saga module for orchestration pattern
 */
@Module({})
export class SagaModule {
  /**
   * Register module with Prisma client
   */
  static forRoot(options?: { prismaClient?: PrismaClient }): DynamicModule {
    const prismaProvider = {
      provide: PRISMA_CLIENT,
      useValue: options?.prismaClient ?? new PrismaClient(),
    };

    const repositoryProvider = {
      provide: SAGA_REPOSITORY,
      useFactory: (prisma: PrismaClient) => new PrismaSagaRepository(prisma),
      inject: [PRISMA_CLIENT],
    };

    return {
      module: SagaModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [prismaProvider, repositoryProvider],
      exports: [SAGA_REPOSITORY, PRISMA_CLIENT],
      global: true,
    };
  }

  /**
   * Register module with async configuration
   */
  static forRootAsync(options: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useFactory: (...args: any[]) => Promise<{ prismaClient?: PrismaClient }> | { prismaClient?: PrismaClient };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    const optionsProvider = {
      provide: 'SAGA_MODULE_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const prismaProvider = {
      provide: PRISMA_CLIENT,
      useFactory: (config: { prismaClient?: PrismaClient }) =>
        config.prismaClient ?? new PrismaClient(),
      inject: ['SAGA_MODULE_OPTIONS'],
    };

    const repositoryProvider = {
      provide: SAGA_REPOSITORY,
      useFactory: (prisma: PrismaClient) => new PrismaSagaRepository(prisma),
      inject: [PRISMA_CLIENT],
    };

    return {
      module: SagaModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [optionsProvider, prismaProvider, repositoryProvider],
      exports: [SAGA_REPOSITORY, PRISMA_CLIENT],
      global: true,
    };
  }
}
