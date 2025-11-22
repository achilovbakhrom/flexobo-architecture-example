import {
  DynamicModule,
  Module,
  Provider,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { IEventStore } from './event-store.interface';
import { PrismaEventStore } from './prisma-event-store';
import { EventUpcasterRegistry } from './event-upcaster.registry';
import { IEventUpcaster } from './event-upcaster.interface';

/**
 * Helper provider to register upcasters on module init
 */
class EventUpcasterRegistrar implements OnModuleInit {
  constructor(
    private readonly registry: EventUpcasterRegistry,
    @Inject('UPCASTERS') private readonly upcasters: IEventUpcaster[]
  ) {}

  onModuleInit() {
    for (const upcaster of this.upcasters) {
      this.registry.register(upcaster);
    }
  }
}

/**
 * Options for configuring the EventStoreModule
 */
export interface EventStoreModuleOptions {
  /**
   * Prisma client instance to use for database operations.
   * If not provided, a new PrismaClient will be created.
   */
  prismaClient?: PrismaClient;

  /**
   * Whether to enable event upcasting.
   * Default: true
   */
  enableUpcasting?: boolean;

  /**
   * Event upcaster providers to register.
   * These will be automatically discovered and registered with the EventUpcasterRegistry.
   */
  upcasters?: Provider[];
}

/**
 * Module that provides event store infrastructure with optional upcasting support.
 *
 * @example
 * ```typescript
 * // In your app module
 * @Module({
 *   imports: [
 *     EventStoreModule.forRoot({
 *       prismaClient: prismaService,
 *       enableUpcasting: true,
 *       upcasters: [
 *         UserRegisteredV1ToV2Upcaster,
 *         UserRegisteredV2ToV3Upcaster,
 *       ]
 *     })
 *   ]
 * })
 * export class AppModule {}
 *
 * // In your service
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @Inject('IEventStore') private readonly eventStore: IEventStore,
 *     private readonly upcasterRegistry: EventUpcasterRegistry
 *   ) {}
 *
 *   async loadUser(userId: string): Promise<User> {
 *     const events = await this.eventStore.getEvents(userId);
 *     const latestVersion = this.upcasterRegistry.getLatestVersion('UserRegistered');
 *     const upcastedEvents = this.upcasterRegistry.upcastMany('UserRegistered', events, latestVersion);
 *     // Rebuild aggregate from upcasted events
 *   }
 * }
 * ```
 */
@Module({})
export class EventStoreModule {
  /**
   * Register EventStoreModule with configuration options
   */
  static forRoot(options: EventStoreModuleOptions = {}): DynamicModule {
    const { prismaClient, enableUpcasting = true, upcasters = [] } = options;

    const providers: Provider[] = [
      // Provide PrismaClient
      {
        provide: PrismaClient,
        useValue: prismaClient || new PrismaClient(),
      },
      // Provide IEventStore implementation
      {
        provide: 'IEventStore',
        useClass: PrismaEventStore,
      },
      // Always provide EventUpcasterRegistry (even if upcasting is disabled)
      EventUpcasterRegistry,
    ];

    // Add upcasting support if enabled
    if (enableUpcasting && upcasters.length > 0) {
      providers.push(
        ...upcasters,
        {
          provide: 'UPCASTERS',
          useFactory: (...instances: IEventUpcaster[]) => instances,
          inject: upcasters.map((u) =>
            typeof u === 'function' ? u : (u as any).provide
          ),
        },
        EventUpcasterRegistrar
      );
    }

    return {
      module: EventStoreModule,
      providers,
      exports: ['IEventStore', EventUpcasterRegistry],
      global: true, // Make event store available globally
    };
  }

  /**
   * Register EventStoreModule for feature modules (async configuration)
   */
  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<EventStoreModuleOptions> | EventStoreModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: EventStoreModule,
      providers: [
        {
          provide: 'EVENT_STORE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: 'IEventStore',
          useClass: PrismaEventStore,
        },
        EventUpcasterRegistry,
      ],
      exports: ['IEventStore', EventUpcasterRegistry],
      global: true,
    };
  }
}
