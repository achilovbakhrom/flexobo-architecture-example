import {
  DynamicModule,
  Module,
  Provider,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { IEventStore } from './event-store.interface';
import {
  PrismaEventStore,
  EVENT_STORE_PRISMA_CLIENT,
} from './prisma-event-store';
import { EventUpcasterRegistry } from './event-upcaster.registry';
import { IEventUpcaster } from './event-upcaster.interface';

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

export interface EventStoreModuleOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaClient?: any;
  enableUpcasting?: boolean;
  upcasters?: Provider[];
}

@Module({})
export class EventStoreModule {
  static forRoot(options: EventStoreModuleOptions = {}): DynamicModule {
    const { prismaClient, enableUpcasting = true, upcasters = [] } = options;

    const providers: Provider[] = [
      {
        provide: EVENT_STORE_PRISMA_CLIENT,
        useValue: prismaClient,
      },
      {
        provide: 'IEventStore',
        useClass: PrismaEventStore,
      },
      EventUpcasterRegistry,
    ];

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
      global: true,
    };
  }

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
