import { DynamicModule, Module, Provider } from '@nestjs/common';
import Redis from 'ioredis';
import {
  RedisEventBuffer,
  RedisEventBufferConfig,
  REDIS_EVENT_BUFFER_CLIENT,
} from './redis-event-buffer';
import { EVENT_BUFFER } from './event-buffer.interface';

/**
 * Configuration options for EventBufferModule
 */
export interface EventBufferModuleOptions {
  /**
   * Redis connection URL or Redis client instance
   */
  redis: string | Redis;

  /**
   * Event buffer configuration
   */
  config?: RedisEventBufferConfig;
}

/**
 * Async configuration options for EventBufferModule
 */
export interface EventBufferModuleAsyncOptions {
  useFactory: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => Promise<EventBufferModuleOptions> | EventBufferModuleOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];
}

/**
 * Module for Redis-based event buffering
 * Provides event ordering for projections handling out-of-sequence events
 */
@Module({})
export class EventBufferModule {
  /**
   * Register module with synchronous configuration
   */
  static forRoot(options: EventBufferModuleOptions): DynamicModule {
    const redisClient =
      typeof options.redis === 'string'
        ? new Redis(options.redis)
        : options.redis;

    const providers: Provider[] = [
      {
        provide: REDIS_EVENT_BUFFER_CLIENT,
        useValue: redisClient,
      },
      {
        provide: RedisEventBuffer,
        useFactory: (redis: Redis) => {
          return new RedisEventBuffer(redis, options.config);
        },
        inject: [REDIS_EVENT_BUFFER_CLIENT],
      },
      {
        provide: EVENT_BUFFER,
        useExisting: RedisEventBuffer,
      },
    ];

    return {
      module: EventBufferModule,
      providers,
      exports: [EVENT_BUFFER, RedisEventBuffer, REDIS_EVENT_BUFFER_CLIENT],
      global: true,
    };
  }

  /**
   * Register module with async configuration
   */
  static forRootAsync(options: EventBufferModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: REDIS_EVENT_BUFFER_CLIENT,
        useFactory: async (...args: unknown[]) => {
          const config = await options.useFactory(...args);
          return typeof config.redis === 'string'
            ? new Redis(config.redis)
            : config.redis;
        },
        inject: options.inject || [],
      },
      {
        provide: 'EVENT_BUFFER_CONFIG',
        useFactory: async (...args: unknown[]) => {
          const config = await options.useFactory(...args);
          return config.config || {};
        },
        inject: options.inject || [],
      },
      {
        provide: RedisEventBuffer,
        useFactory: (redis: Redis, config: RedisEventBufferConfig) => {
          return new RedisEventBuffer(redis, config);
        },
        inject: [REDIS_EVENT_BUFFER_CLIENT, 'EVENT_BUFFER_CONFIG'],
      },
      {
        provide: EVENT_BUFFER,
        useExisting: RedisEventBuffer,
      },
    ];

    return {
      module: EventBufferModule,
      providers,
      exports: [EVENT_BUFFER, RedisEventBuffer, REDIS_EVENT_BUFFER_CLIENT],
      global: true,
    };
  }
}
