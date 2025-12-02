import { DynamicModule, Module } from '@nestjs/common';
import { TwoPhaseCoordinator } from './two-phase-coordinator';
import {
  PrismaTwoPhaseRepository,
  TWO_PHASE_PRISMA_CLIENT,
} from './prisma-two-phase.repository';

export const TWO_PHASE_REPOSITORY = 'TWO_PHASE_REPOSITORY';

export interface TwoPhaseCommitModuleOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaClient?: any;
  coordinatorId?: string;
  defaultTimeout?: number;
}

@Module({})
export class TwoPhaseCommitModule {
  static forRoot(options: TwoPhaseCommitModuleOptions = {}): DynamicModule {
    const prismaProvider = {
      provide: TWO_PHASE_PRISMA_CLIENT,
      useValue: options.prismaClient,
    };

    const repositoryProvider = {
      provide: TWO_PHASE_REPOSITORY,
      useClass: PrismaTwoPhaseRepository,
    };

    return {
      module: TwoPhaseCommitModule,
      providers: [prismaProvider, repositoryProvider, TwoPhaseCoordinator],
      exports: [TWO_PHASE_REPOSITORY, TwoPhaseCoordinator],
    };
  }

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
        return config.prismaClient;
      },
      inject: ['TWO_PHASE_COMMIT_MODULE_OPTIONS'],
    };

    const repositoryProvider = {
      provide: TWO_PHASE_REPOSITORY,
      useClass: PrismaTwoPhaseRepository,
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
