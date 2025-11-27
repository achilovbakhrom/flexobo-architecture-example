import { DynamicModule, Module, Provider } from '@nestjs/common';
import { RabbitMQPublisher } from './rabbitmq-publisher';
import { RabbitMQConsumer, RabbitMQConsumerConfig } from './rabbitmq-consumer';
import { RabbitMQConfig } from './rabbitmq.config';

export const MESSAGE_PUBLISHER = 'MESSAGE_PUBLISHER';
export const MESSAGE_CONSUMER = 'MESSAGE_CONSUMER';
export const RABBITMQ_CONFIG = 'RABBITMQ_CONFIG';

/**
 * Messaging module configuration options
 */
export interface MessagingModuleOptions {
  /**
   * RabbitMQ configuration
   */
  config: RabbitMQConfig & RabbitMQConsumerConfig;

  /**
   * Enable publisher (default: true)
   */
  enablePublisher?: boolean;

  /**
   * Enable consumer (default: true)
   */
  enableConsumer?: boolean;
}

/**
 * Messaging module for RabbitMQ integration
 * Provides publisher and consumer for event-driven communication
 */
@Module({})
export class MessagingModule {
  /**
   * Register module with configuration
   */
  static forRoot(options: MessagingModuleOptions): DynamicModule {
    const { config, enablePublisher = true, enableConsumer = true } = options;

    const providers: Provider[] = [
      {
        provide: RABBITMQ_CONFIG,
        useValue: config,
      },
    ];

    const exports: string[] = [RABBITMQ_CONFIG];

    if (enablePublisher) {
      providers.push({
        provide: MESSAGE_PUBLISHER,
        useFactory: async (cfg: RabbitMQConfig) => {
          const publisher = new RabbitMQPublisher(cfg);
          await publisher.connect();
          return publisher;
        },
        inject: [RABBITMQ_CONFIG],
      });
      exports.push(MESSAGE_PUBLISHER);
    }

    if (enableConsumer) {
      providers.push({
        provide: MESSAGE_CONSUMER,
        useFactory: async (cfg: RabbitMQConsumerConfig) => {
          const consumer = new RabbitMQConsumer(cfg);
          await consumer.connect();
          return consumer;
        },
        inject: [RABBITMQ_CONFIG],
      });
      exports.push(MESSAGE_CONSUMER);
    }

    return {
      module: MessagingModule,
      providers,
      exports,
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
    ) => Promise<MessagingModuleOptions> | MessagingModuleOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: RABBITMQ_CONFIG,
        useFactory: async (...args: unknown[]) => {
          const result = await options.useFactory(...args);
          return result.config;
        },
        inject: options.inject || [],
      },
      {
        provide: MESSAGE_PUBLISHER,
        useFactory: async (cfg: RabbitMQConfig) => {
          const publisher = new RabbitMQPublisher(cfg);
          await publisher.connect();
          return publisher;
        },
        inject: [RABBITMQ_CONFIG],
      },
      {
        provide: MESSAGE_CONSUMER,
        useFactory: async (cfg: RabbitMQConsumerConfig) => {
          const consumer = new RabbitMQConsumer(cfg);
          await consumer.connect();
          return consumer;
        },
        inject: [RABBITMQ_CONFIG],
      },
    ];

    return {
      module: MessagingModule,
      providers,
      exports: [RABBITMQ_CONFIG, MESSAGE_PUBLISHER, MESSAGE_CONSUMER],
      global: true,
    };
  }
}
