import { DynamicModule, Module, Provider } from '@nestjs/common';
import { RabbitMQPublisher } from './rabbitmq-publisher';
import { RabbitMQConfig } from './rabbitmq.config';

export const MESSAGE_PUBLISHER = 'MESSAGE_PUBLISHER';
export const RABBITMQ_CONFIG = 'RABBITMQ_CONFIG';

/**
 * Messaging module for RabbitMQ integration
 * Provides publisher for event-driven communication
 */
@Module({})
export class MessagingModule {
  /**
   * Register module with configuration
   */
  static forRoot(config: RabbitMQConfig): DynamicModule {
    const configProvider: Provider = {
      provide: RABBITMQ_CONFIG,
      useValue: config,
    };

    const publisherProvider: Provider = {
      provide: MESSAGE_PUBLISHER,
      useFactory: async (cfg: RabbitMQConfig) => {
        const publisher = new RabbitMQPublisher(cfg);
        await publisher.connect();
        return publisher;
      },
      inject: [RABBITMQ_CONFIG],
    };

    return {
      module: MessagingModule,
      providers: [configProvider, publisherProvider],
      exports: [MESSAGE_PUBLISHER],
      global: true,
    };
  }

  /**
   * Register module with async configuration
   */
  static forRootAsync(options: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useFactory: (...args: any[]) => Promise<RabbitMQConfig> | RabbitMQConfig;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    const configProvider: Provider = {
      provide: RABBITMQ_CONFIG,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const publisherProvider: Provider = {
      provide: MESSAGE_PUBLISHER,
      useFactory: async (cfg: RabbitMQConfig) => {
        const publisher = new RabbitMQPublisher(cfg);
        await publisher.connect();
        return publisher;
      },
      inject: [RABBITMQ_CONFIG],
    };

    return {
      module: MessagingModule,
      providers: [configProvider, publisherProvider],
      exports: [MESSAGE_PUBLISHER],
      global: true,
    };
  }
}
