import { DynamicModule, Module, Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisCache } from './redis-cache';
import { CacheConfig } from './cache.interface';
import {
  CacheInvalidationStrategy,
  CacheWarmingService,
  DefaultCacheKeyStrategy,
} from './cache-strategy';
import { registerCache } from './cache.decorator';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const CACHE_SERVICE = 'CACHE_SERVICE';
export const CACHE_KEY_STRATEGY = 'CACHE_KEY_STRATEGY';
export const CACHE_INVALIDATION_STRATEGY = 'CACHE_INVALIDATION_STRATEGY';
export const CACHE_WARMING_SERVICE = 'CACHE_WARMING_SERVICE';

/**
 * Redis configuration
 */
export interface RedisConfig {
  /**
   * Redis host
   */
  host: string;

  /**
   * Redis port
   */
  port: number;

  /**
   * Redis password
   */
  password?: string;

  /**
   * Redis database number
   */
  db?: number;

  /**
   * Connection timeout
   */
  connectTimeout?: number;

  /**
   * Key prefix
   */
  keyPrefix?: string;

  /**
   * Max retry attempts
   */
  maxRetriesPerRequest?: number;

  /**
   * Enable offline queue
   */
  enableOfflineQueue?: boolean;

  /**
   * Enable ready check
   */
  enableReadyCheck?: boolean;
}

/**
 * Cache module options
 */
export interface CacheModuleOptions {
  redis: RedisConfig;
  cache?: CacheConfig;
}

/**
 * Cache module for Redis-based caching
 */
@Module({})
export class CacheModule {
  /**
   * Register module with configuration
   */
  static forRoot(options: CacheModuleOptions): DynamicModule {
    const redisProvider: Provider = {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const client = new Redis({
          host: options.redis.host,
          port: options.redis.port,
          password: options.redis.password,
          db: options.redis.db ?? 0,
          connectTimeout: options.redis.connectTimeout ?? 10000,
          keyPrefix: options.redis.keyPrefix,
          maxRetriesPerRequest: options.redis.maxRetriesPerRequest ?? 3,
          enableOfflineQueue: options.redis.enableOfflineQueue ?? true,
          enableReadyCheck: options.redis.enableReadyCheck ?? true,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

        return client;
      },
    };

    const cacheProvider: Provider = {
      provide: CACHE_SERVICE,
      useFactory: (redisClient: Redis) => {
        const cache = new RedisCache(redisClient, options.cache);
        registerCache('default', cache);
        return cache;
      },
      inject: [REDIS_CLIENT],
    };

    const keyStrategyProvider: Provider = {
      provide: CACHE_KEY_STRATEGY,
      useClass: DefaultCacheKeyStrategy,
    };

    const invalidationStrategyProvider: Provider = {
      provide: CACHE_INVALIDATION_STRATEGY,
      useFactory: (cache: RedisCache, keyStrategy: DefaultCacheKeyStrategy) => {
        return new CacheInvalidationStrategy(cache, keyStrategy);
      },
      inject: [CACHE_SERVICE, CACHE_KEY_STRATEGY],
    };

    const warmingServiceProvider: Provider = {
      provide: CACHE_WARMING_SERVICE,
      useFactory: (cache: RedisCache) => {
        return new CacheWarmingService(cache);
      },
      inject: [CACHE_SERVICE],
    };

    return {
      module: CacheModule,
      providers: [
        redisProvider,
        cacheProvider,
        keyStrategyProvider,
        invalidationStrategyProvider,
        warmingServiceProvider,
      ],
      exports: [
        CACHE_SERVICE,
        CACHE_KEY_STRATEGY,
        CACHE_INVALIDATION_STRATEGY,
        CACHE_WARMING_SERVICE,
      ],
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
    ) => Promise<CacheModuleOptions> | CacheModuleOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inject?: any[];
  }): DynamicModule {
    const optionsProvider: Provider = {
      provide: 'CACHE_MODULE_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const redisProvider: Provider = {
      provide: REDIS_CLIENT,
      useFactory: (config: CacheModuleOptions) => {
        const client = new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db ?? 0,
          connectTimeout: config.redis.connectTimeout ?? 10000,
          keyPrefix: config.redis.keyPrefix,
          maxRetriesPerRequest: config.redis.maxRetriesPerRequest ?? 3,
          enableOfflineQueue: config.redis.enableOfflineQueue ?? true,
          enableReadyCheck: config.redis.enableReadyCheck ?? true,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

        return client;
      },
      inject: ['CACHE_MODULE_OPTIONS'],
    };

    const cacheProvider: Provider = {
      provide: CACHE_SERVICE,
      useFactory: (redisClient: Redis, config: CacheModuleOptions) => {
        const cache = new RedisCache(redisClient, config.cache);
        registerCache('default', cache);
        return cache;
      },
      inject: [REDIS_CLIENT, 'CACHE_MODULE_OPTIONS'],
    };

    const keyStrategyProvider: Provider = {
      provide: CACHE_KEY_STRATEGY,
      useClass: DefaultCacheKeyStrategy,
    };

    const invalidationStrategyProvider: Provider = {
      provide: CACHE_INVALIDATION_STRATEGY,
      useFactory: (cache: RedisCache, keyStrategy: DefaultCacheKeyStrategy) => {
        return new CacheInvalidationStrategy(cache, keyStrategy);
      },
      inject: [CACHE_SERVICE, CACHE_KEY_STRATEGY],
    };

    const warmingServiceProvider: Provider = {
      provide: CACHE_WARMING_SERVICE,
      useFactory: (cache: RedisCache) => {
        return new CacheWarmingService(cache);
      },
      inject: [CACHE_SERVICE],
    };

    return {
      module: CacheModule,
      providers: [
        optionsProvider,
        redisProvider,
        cacheProvider,
        keyStrategyProvider,
        invalidationStrategyProvider,
        warmingServiceProvider,
      ],
      exports: [
        CACHE_SERVICE,
        CACHE_KEY_STRATEGY,
        CACHE_INVALIDATION_STRATEGY,
        CACHE_WARMING_SERVICE,
      ],
      global: true,
    };
  }
}
