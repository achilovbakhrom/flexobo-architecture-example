import { DynamicModule, Module, Provider } from '@nestjs/common';
import { SnapshotService } from './snapshot.service';
import {
  PrismaSnapshotRepository,
  SNAPSHOT_PRISMA_CLIENT,
} from './prisma-snapshot.repository';
import { ISnapshotRepository, SnapshotStrategy } from './snapshot.interface';

export interface SnapshotModuleOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaClient?: any;
  strategy?: SnapshotStrategy;
}

@Module({})
export class SnapshotModule {
  static forRoot(options: SnapshotModuleOptions = {}): DynamicModule {
    const { prismaClient, strategy } = options;

    const providers: Provider[] = [
      {
        provide: 'ISnapshotRepository',
        useClass: PrismaSnapshotRepository,
      },
      {
        provide: SnapshotService,
        useFactory: (repository: ISnapshotRepository) => {
          return new SnapshotService(repository, strategy);
        },
        inject: ['ISnapshotRepository'],
      },
    ];

    // Only provide SNAPSHOT_PRISMA_CLIENT if prismaClient is passed
    // This allows the consuming module to provide it externally
    if (prismaClient) {
      providers.unshift({
        provide: SNAPSHOT_PRISMA_CLIENT,
        useValue: prismaClient,
      });
    }

    return {
      module: SnapshotModule,
      providers,
      exports: [SnapshotService, 'ISnapshotRepository', SNAPSHOT_PRISMA_CLIENT],
      global: true,
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => Promise<SnapshotModuleOptions> | SnapshotModuleOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    return {
      module: SnapshotModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'SNAPSHOT_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: SNAPSHOT_PRISMA_CLIENT,
          useFactory: (opts: SnapshotModuleOptions) => opts.prismaClient,
          inject: ['SNAPSHOT_OPTIONS'],
        },
        {
          provide: 'ISnapshotRepository',
          useClass: PrismaSnapshotRepository,
        },
        {
          provide: SnapshotService,
          useFactory: (repository: ISnapshotRepository, opts: SnapshotModuleOptions) => {
            return new SnapshotService(repository, opts.strategy);
          },
          inject: ['ISnapshotRepository', 'SNAPSHOT_OPTIONS'],
        },
      ],
      exports: [SnapshotService, 'ISnapshotRepository', SNAPSHOT_PRISMA_CLIENT],
      global: true,
    };
  }
}
