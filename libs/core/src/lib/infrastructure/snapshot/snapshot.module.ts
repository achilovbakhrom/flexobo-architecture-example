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
        provide: SNAPSHOT_PRISMA_CLIENT,
        useValue: prismaClient,
      },
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

    return {
      module: SnapshotModule,
      providers,
      exports: [SnapshotService, 'ISnapshotRepository'],
      global: true,
    };
  }

  static forRootAsync(options: {
    useFactory: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => Promise<SnapshotModuleOptions> | SnapshotModuleOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    return {
      module: SnapshotModule,
      providers: [
        {
          provide: 'SNAPSHOT_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: 'ISnapshotRepository',
          useClass: PrismaSnapshotRepository,
        },
        SnapshotService,
      ],
      exports: [SnapshotService, 'ISnapshotRepository'],
      global: true,
    };
  }
}
