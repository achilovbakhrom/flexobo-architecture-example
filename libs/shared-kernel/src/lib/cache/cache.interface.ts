/**
 * Cache interface for abstracting cache implementations
 */
export interface ICache {
  /**
   * Get value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete value from cache
   */
  del(key: string): Promise<void>;

  /**
   * Delete multiple keys matching pattern
   */
  delPattern(pattern: string): Promise<number>;

  /**
   * Check if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Set expiration on key
   */
  expire(key: string, ttl: number): Promise<void>;

  /**
   * Get remaining TTL for key
   */
  ttl(key: string): Promise<number>;

  /**
   * Get multiple values
   */
  mget<T>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Set multiple values
   */
  mset(entries: Record<string, unknown>, ttl?: number): Promise<void>;

  /**
   * Increment numeric value
   */
  incr(key: string): Promise<number>;

  /**
   * Decrement numeric value
   */
  decr(key: string): Promise<number>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Get all keys matching pattern
   */
  keys(pattern: string): Promise<string[]>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /**
   * Default TTL in seconds
   * Default: 3600 (1 hour)
   */
  defaultTtl?: number;

  /**
   * Key prefix for namespacing
   */
  prefix?: string;

  /**
   * Enable cache statistics
   */
  enableStats?: boolean;

  /**
   * Serialization strategy
   */
  serializer?: {
    serialize: (value: unknown) => string;
    deserialize: <T>(value: string) => T;
  };
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

/**
 * Cache invalidation event
 */
export interface CacheInvalidationEvent {
  pattern: string;
  reason: string;
  timestamp: number;
}
