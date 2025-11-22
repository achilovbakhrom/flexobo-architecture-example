import { DynamicModule, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TwoPhaseCoordinator } from './two-phase-coordinator';
import { PrismaTwoPhaseRepository } from './prisma-two-phase.repository';

export const TWO_PHASE_REPOSITORY = 'TWO_PHASE_REPOSITORY';
export const TWO_PHASE_PRISMA_CLIENT = 'TWO_PHASE_PRISMA_CLIENT';

/**
 * Configuration options for Two-Phase Commit module
 */
export interface TwoPhaseCommitModuleOptions {
  /**
   * Custom Prisma client instance
   */
  prismaClient?: PrismaClient;

  /**
   * Coordinator ID for this instance
   */
  coordinatorId?: string;

  /**
   * Default timeout for transactions (milliseconds)
   */
  defaultTimeout?: number;
}

/**
 * Module for two-phase commit distributed transactions
 */
@Module({})
export class TwoPhaseCommitModule {
  /**
   * Register module with configuration
   */
  static forRoot(options: TwoPhaseCommitModuleOptions = {}): DynamicModule {
    const prismaProvider = {
      provide: TWO_PHASE_PRISMA_CLIENT,
      useValue: options.prismaClient || new PrismaClient(),
    };

    const repositoryProvider = {
      provide: TWO_PHASE_REPOSITORY,
      useFactory: (prisma: PrismaClient) => {
        return new PrismaTwoPhaseRepository(prisma);
      },
      inject: [TWO_PHASE_PRISMA_CLIENT],
    };

    return {
      module: TwoPhaseCommitModule,
      providers: [prismaProvider, repositoryProvider, TwoPhaseCoordinator],
      exports: [TWO_PHASE_REPOSITORY, TwoPhaseCoordinator],
    };
  }

  /**
   * Register module with async configuration
   */
  static forRootAsync(options: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useFactory: (
      ...args: any[]
    ) => Promise<TwoPhaseCommitModuleOptions> | TwoPhaseCommitModuleOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    const optionsProvider = {
      provide: 'TWO_PHASE_COMMIT_MODULE_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const prismaProvider = {
      provide: TWO_PHASE_PRISMA_CLIENT,
      useFactory: (config: TwoPhaseCommitModuleOptions) => {
        return config.prismaClient || new PrismaClient();
      },
      inject: ['TWO_PHASE_COMMIT_MODULE_OPTIONS'],
    };

    const repositoryProvider = {
      provide: TWO_PHASE_REPOSITORY,
      useFactory: (prisma: PrismaClient) => {
        return new PrismaTwoPhaseRepository(prisma);
      },
      inject: [TWO_PHASE_PRISMA_CLIENT],
    };

    return {
      module: TwoPhaseCommitModule,
      providers: [
        optionsProvider,
        prismaProvider,
        repositoryProvider,
        TwoPhaseCoordinator,
      ],
      exports: [TWO_PHASE_REPOSITORY, TwoPhaseCoordinator],
    };
  }
}
