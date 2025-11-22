import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SnapshotService } from './snapshot.service';
import { PrismaSnapshotRepository } from './prisma-snapshot.repository';
import { ISnapshotRepository, SnapshotStrategy } from './snapshot.interface';

/**
 * Options for configuring the SnapshotModule
 */
export interface SnapshotModuleOptions {
  /**
   * Prisma client instance to use for database operations.
   * If not provided, a new PrismaClient will be created.
   */
  prismaClient?: PrismaClient;

  /**
   * Snapshot strategy configuration
   */
  strategy?: SnapshotStrategy;
}

/**
 * Module that provides snapshot infrastructure for aggregate optimization.
 *
 * Snapshots reduce aggregate loading time by storing the aggregate state
 * at specific versions, eliminating the need to replay all events.
 *
 * @example
 * ```typescript
 * // In your app module
 * @Module({
 *   imports: [
 *     SnapshotModule.forRoot({
 *       prismaClient: prismaService,
 *       strategy: {
 *         snapshotFrequency: 20,  // Snapshot every 20 events
 *         keepLatestSnapshots: 2,  // Keep last 2 snapshots
 *         enabled: true,
 *         expirationDays: 30
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
 *     private readonly snapshotService: SnapshotService
 *   ) {}
 *
 *   async loadTruck(truckId: string): Promise<Truck> {
 *     // Try to load from snapshot
 *     const snapshot = await this.snapshotService.getLatestSnapshot(truckId);
 *
 *     let truck: Truck;
 *     let fromVersion = 0;
 *
 *     if (snapshot) {
 *       // Restore from snapshot
 *       truck = Truck.fromSnapshot(snapshot.data);
 *       fromVersion = snapshot.version;
 *     } else {
 *       // Create new aggregate
 *       truck = new Truck(truckId);
 *     }
 *
 *     // Load and replay events since snapshot
 *     const events = await this.eventStore.getEvents(truckId);
 *     const newEvents = events.filter(e => e.version > fromVersion);
 *
 *     truck.replayEvents(newEvents.map(e => e.eventData));
 *
 *     return truck;
 *   }
 *
 *   async saveTruck(truck: Truck): Promise<void> {
 *     const events = truck.getUncommittedEvents();
 *     const version = truck.getVersion();
 *
 *     // Save events
 *     await this.eventStore.append(truck.getId(), events, version - events.length);
 *
 *     // Create snapshot if needed
 *     await this.snapshotService.createSnapshot(truck, 'Truck');
 *   }
 * }
 * ```
 */
@Module({})
export class SnapshotModule {
  /**
   * Register SnapshotModule with configuration options
   */
  static forRoot(options: SnapshotModuleOptions = {}): DynamicModule {
    const { prismaClient, strategy } = options;

    const providers: Provider[] = [
      // Provide PrismaClient
      {
        provide: PrismaClient,
        useValue: prismaClient || new PrismaClient(),
      },
      // Provide ISnapshotRepository implementation
      {
        provide: 'ISnapshotRepository',
        useClass: PrismaSnapshotRepository,
      },
      // Provide SnapshotService
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
      global: true, // Make snapshot service available globally
    };
  }

  /**
   * Register SnapshotModule for feature modules (async configuration)
   */
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
