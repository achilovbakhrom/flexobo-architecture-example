import { DynamicModule, Module } from '@nestjs/common';
import { InMemoryEventBus } from './in-memory-event-bus';
import { RabbitMQEventBus } from './rabbitmq-event-bus';
import { IEventBus } from './choreography.interface';

export const EVENT_BUS = 'EVENT_BUS';

/**
 * Configuration options for choreography module
 */
export interface ChoreographyModuleOptions {
  /**
   * Event bus implementation
   * 'memory' for in-memory (testing/development)
   * 'rabbitmq' for RabbitMQ (production)
   */
  eventBus: 'memory' | 'rabbitmq';

  /**
   * RabbitMQ URL (required if eventBus is 'rabbitmq')
   */
  rabbitMQUrl?: string;

  /**
   * Queue prefix for RabbitMQ queues
   */
  queuePrefix?: string;
}

/**
 * Choreography module for saga choreography pattern
 */
@Module({})
export class ChoreographyModule {
  /**
   * Register module with configuration
   */
  static forRoot(options: ChoreographyModuleOptions): DynamicModule {
    const eventBusProvider = {
      provide: EVENT_BUS,
      useFactory: (): IEventBus => {
        if (options.eventBus === 'rabbitmq') {
          if (!options.rabbitMQUrl) {
            throw new Error('rabbitMQUrl is required for RabbitMQ event bus');
          }
          return new RabbitMQEventBus(options.rabbitMQUrl, options.queuePrefix);
        } else {
          return new InMemoryEventBus();
        }
      },
    };

    return {
      module: ChoreographyModule,
      providers: [eventBusProvider],
      exports: [EVENT_BUS],
      global: true,
    };
  }

  /**
   * Register module with async configuration
   */
  static forRootAsync(options: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useFactory: (
      ...args: any[]
    ) => Promise<ChoreographyModuleOptions> | ChoreographyModuleOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    const optionsProvider = {
      provide: 'CHOREOGRAPHY_MODULE_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const eventBusProvider = {
      provide: EVENT_BUS,
      useFactory: (config: ChoreographyModuleOptions): IEventBus => {
        if (config.eventBus === 'rabbitmq') {
          if (!config.rabbitMQUrl) {
            throw new Error('rabbitMQUrl is required for RabbitMQ event bus');
          }
          return new RabbitMQEventBus(config.rabbitMQUrl, config.queuePrefix);
        } else {
          return new InMemoryEventBus();
        }
      },
      inject: ['CHOREOGRAPHY_MODULE_OPTIONS'],
    };

    return {
      module: ChoreographyModule,
      providers: [optionsProvider, eventBusProvider],
      exports: [EVENT_BUS],
      global: true,
    };
  }
}
