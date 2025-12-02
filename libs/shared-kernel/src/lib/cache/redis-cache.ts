import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ICache, CacheConfig, CacheStats } from './cache.interface';

/**
 * Redis cache implementation
 */
@Injectable()
export class RedisCache implements ICache, OnModuleDestroy {
  private readonly logger = new Logger(RedisCache.name);
  private readonly client: Redis;
  private readonly config: Required<CacheConfig>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };

  constructor(redisClient: Redis, config: CacheConfig = {}) {
    this.client = redisClient;
    this.config = {
      defaultTtl: config.defaultTtl ?? 3600,
      prefix: config.prefix ?? 'cache:',
      enableStats: config.enableStats ?? true,
      serializer: config.serializer ?? {
        serialize: (value: unknown) => JSON.stringify(value),
        deserialize: <T>(value: string) => JSON.parse(value) as T,
      },
    };

    this.setupEventHandlers();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis ready');
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  /**
   * Build prefixed key
   */
  private buildKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const prefixedKey = this.buildKey(key);
    const value = await this.client.get(prefixedKey);

    if (value === null) {
      if (this.config.enableStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return null;
    }

    if (this.config.enableStats) {
      this.stats.hits++;
      this.updateHitRate();
    }

    try {
      return this.config.serializer.deserialize<T>(value);
    } catch (error) {
      this.logger.error(
        `Failed to deserialize cache value for key ${key}: ${error}`
      );
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const prefixedKey = this.buildKey(key);
    const serialized = this.config.serializer.serialize(value);
    const effectiveTtl = ttl ?? this.config.defaultTtl;

    if (effectiveTtl > 0) {
      await this.client.setex(prefixedKey, effectiveTtl, serialized);
    } else {
      await this.client.set(prefixedKey, serialized);
    }

    if (this.config.enableStats) {
      this.stats.sets++;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    const prefixedKey = this.buildKey(key);
    await this.client.del(prefixedKey);

    if (this.config.enableStats) {
      this.stats.deletes++;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    const prefixedPattern = this.buildKey(pattern);
    const keys = await this.client.keys(prefixedPattern);

    if (keys.length === 0) {
      return 0;
    }

    const deleted = await this.client.del(...keys);

    if (this.config.enableStats) {
      this.stats.deletes += deleted;
    }

    return deleted;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const prefixedKey = this.buildKey(key);
    const result = await this.client.exists(prefixedKey);
    return result === 1;
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, ttl: number): Promise<void> {
    const prefixedKey = this.buildKey(key);
    await this.client.expire(prefixedKey, ttl);
  }

  /**
   * Get remaining TTL
   */
  async ttl(key: string): Promise<number> {
    const prefixedKey = this.buildKey(key);
    return await this.client.ttl(prefixedKey);
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const prefixedKeys = keys.map((k) => this.buildKey(k));
    const values = await this.client.mget(...prefixedKeys);

    return values.map((value) => {
      if (value === null) {
        if (this.config.enableStats) {
          this.stats.misses++;
        }
        return null;
      }

      if (this.config.enableStats) {
        this.stats.hits++;
      }

      try {
        return this.config.serializer.deserialize<T>(value);
      } catch (error) {
        this.logger.error(`Failed to deserialize cache value: ${error}`);
        return null;
      }
    });
  }

  /**
   * Set multiple values
   */
  async mset(entries: Record<string, unknown>, ttl?: number): Promise<void> {
    const pipeline = this.client.pipeline();
    const effectiveTtl = ttl ?? this.config.defaultTtl;

    for (const [key, value] of Object.entries(entries)) {
      const prefixedKey = this.buildKey(key);
      const serialized = this.config.serializer.serialize(value);

      if (effectiveTtl > 0) {
        pipeline.setex(prefixedKey, effectiveTtl, serialized);
      } else {
        pipeline.set(prefixedKey, serialized);
      }
    }

    await pipeline.exec();

    if (this.config.enableStats) {
      this.stats.sets += Object.keys(entries).length;
    }
  }

  /**
   * Increment numeric value
   */
  async incr(key: string): Promise<number> {
    const prefixedKey = this.buildKey(key);
    return await this.client.incr(prefixedKey);
  }

  /**
   * Decrement numeric value
   */
  async decr(key: string): Promise<number> {
    const prefixedKey = this.buildKey(key);
    return await this.client.decr(prefixedKey);
  }

  /**
   * Clear all cache entries with prefix
   */
  async clear(): Promise<void> {
    const pattern = this.buildKey('*');
    const keys = await this.client.keys(pattern);

    if (keys.length > 0) {
      await this.client.del(...keys);
      this.logger.log(`Cleared ${keys.length} cache entries`);
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const prefixedPattern = this.buildKey(pattern);
    const keys = await this.client.keys(prefixedPattern);

    // Remove prefix from returned keys
    return keys.map((key) => key.slice(this.config.prefix.length));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Module destroy hook
   */
  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }
}
