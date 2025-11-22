import { ICache } from './cache.interface';

const caches = new Map<string, ICache>();

/**
 * Cache decorator options
 */
export interface CacheOptions {
  /**
   * TTL in seconds
   */
  ttl?: number;

  /**
   * Key generator function
   */
  keyGenerator?: (...args: unknown[]) => string;

  /**
   * Cache instance name
   * Default: 'default'
   */
  cacheName?: string;

  /**
   * Condition to determine if result should be cached
   */
  condition?: (result: unknown) => boolean;
}

/**
 * Decorator to cache method results
 *
 * @example
 * ```typescript
 * class TruckService {
 *   @Cacheable({ ttl: 300, keyGenerator: (id) => `truck:${id}` })
 *   async getTruck(id: string): Promise<Truck> {
 *     return await this.repository.findById(id);
 *   }
 * }
 * ```
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cacheName = options.cacheName || 'default';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      const cache = caches.get(cacheName);
      if (!cache) {
        // If cache not available, execute original method
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = await cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Check condition before caching
      if (options.condition && !options.condition(result)) {
        return result;
      }

      // Cache result
      await cache.set(key, result, options.ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator to evict cache entries
 *
 * @example
 * ```typescript
 * class TruckService {
 *   @CacheEvict({ keyGenerator: (id) => `truck:${id}` })
 *   async updateTruck(id: string, data: UpdateData): Promise<void> {
 *     await this.repository.update(id, data);
 *   }
 *
 *   @CacheEvict({ pattern: 'truck:*', allEntries: true })
 *   async deleteAllTrucks(): Promise<void> {
 *     await this.repository.deleteAll();
 *   }
 * }
 * ```
 */
export function CacheEvict(options: {
  keyGenerator?: (...args: unknown[]) => string;
  pattern?: string;
  allEntries?: boolean;
  cacheName?: string;
  beforeInvocation?: boolean;
}) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cacheName = options.cacheName || 'default';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      const cache = caches.get(cacheName);

      const evict = async () => {
        if (!cache) return;

        if (options.allEntries && options.pattern) {
          await cache.delPattern(options.pattern);
        } else if (options.keyGenerator) {
          const key = options.keyGenerator(...args);
          await cache.del(key);
        }
      };

      // Evict before method execution
      if (options.beforeInvocation) {
        await evict();
      }

      const result = await originalMethod.apply(this, args);

      // Evict after method execution
      if (!options.beforeInvocation) {
        await evict();
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Register cache instance
 */
export function registerCache(name: string, cache: ICache): void {
  caches.set(name, cache);
}

/**
 * Get cache instance
 */
export function getCache(name = 'default'): ICache | undefined {
  return caches.get(name);
}

/**
 * Clear all registered caches
 */
export function clearCaches(): void {
  caches.clear();
}
