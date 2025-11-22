import { Injectable, Logger } from '@nestjs/common';
import { ICache } from './cache.interface';

/**
 * Cache key strategy for generating consistent keys
 */
export interface CacheKeyStrategy {
  /**
   * Generate cache key for aggregate
   */
  forAggregate(aggregateType: string, aggregateId: string): string;

  /**
   * Generate cache key for query
   */
  forQuery(queryType: string, params: Record<string, unknown>): string;

  /**
   * Generate cache key for list with pagination
   */
  forList(
    resourceType: string,
    filters: Record<string, unknown>,
    page?: number,
    limit?: number
  ): string;

  /**
   * Generate cache key for company-specific data
   */
  forCompany(
    companyId: string,
    resourceType: string,
    identifier: string
  ): string;
}

/**
 * Default cache key strategy implementation
 */
export class DefaultCacheKeyStrategy implements CacheKeyStrategy {
  forAggregate(aggregateType: string, aggregateId: string): string {
    return `aggregate:${aggregateType}:${aggregateId}`;
  }

  forQuery(queryType: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `query:${queryType}:${sortedParams}`;
  }

  forList(
    resourceType: string,
    filters: Record<string, unknown>,
    page?: number,
    limit?: number
  ): string {
    const filterStr = Object.keys(filters)
      .sort()
      .map((key) => `${key}=${JSON.stringify(filters[key])}`)
      .join('&');
    const pagination =
      page !== undefined && limit !== undefined
        ? `:page=${page}:limit=${limit}`
        : '';
    return `list:${resourceType}:${filterStr}${pagination}`;
  }

  forCompany(
    companyId: string,
    resourceType: string,
    identifier: string
  ): string {
    return `company:${companyId}:${resourceType}:${identifier}`;
  }
}

/**
 * Cache invalidation strategy for event-driven cache invalidation
 */
@Injectable()
export class CacheInvalidationStrategy {
  private readonly logger = new Logger(CacheInvalidationStrategy.name);

  constructor(
    private readonly cache: ICache,
    private readonly keyStrategy: CacheKeyStrategy = new DefaultCacheKeyStrategy()
  ) {}

  /**
   * Invalidate aggregate cache
   */
  async invalidateAggregate(
    aggregateType: string,
    aggregateId: string
  ): Promise<void> {
    const key = this.keyStrategy.forAggregate(aggregateType, aggregateId);
    await this.cache.del(key);
    this.logger.debug(`Invalidated cache for ${aggregateType}:${aggregateId}`);
  }

  /**
   * Invalidate all caches for aggregate type
   */
  async invalidateAggregateType(aggregateType: string): Promise<void> {
    const pattern = `aggregate:${aggregateType}:*`;
    const count = await this.cache.delPattern(pattern);
    this.logger.debug(
      `Invalidated ${count} cache entries for ${aggregateType}`
    );
  }

  /**
   * Invalidate query caches
   */
  async invalidateQuery(queryType: string): Promise<void> {
    const pattern = `query:${queryType}:*`;
    const count = await this.cache.delPattern(pattern);
    this.logger.debug(
      `Invalidated ${count} query cache entries for ${queryType}`
    );
  }

  /**
   * Invalidate list caches
   */
  async invalidateList(resourceType: string): Promise<void> {
    const pattern = `list:${resourceType}:*`;
    const count = await this.cache.delPattern(pattern);
    this.logger.debug(
      `Invalidated ${count} list cache entries for ${resourceType}`
    );
  }

  /**
   * Invalidate company-specific caches
   */
  async invalidateCompany(
    companyId: string,
    resourceType?: string
  ): Promise<void> {
    const pattern = resourceType
      ? `company:${companyId}:${resourceType}:*`
      : `company:${companyId}:*`;
    const count = await this.cache.delPattern(pattern);
    this.logger.debug(
      `Invalidated ${count} cache entries for company ${companyId}`
    );
  }

  /**
   * Invalidate related caches when aggregate changes
   */
  async invalidateRelated(
    aggregateType: string,
    aggregateId: string
  ): Promise<void> {
    // Invalidate the aggregate itself
    await this.invalidateAggregate(aggregateType, aggregateId);

    // Invalidate list caches that might include this aggregate
    await this.invalidateList(aggregateType);

    // Invalidate related queries
    await this.invalidateQuery(aggregateType);
  }
}

/**
 * Cache warming service for pre-loading frequently accessed data
 */
@Injectable()
export class CacheWarmingService {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(private readonly cache: ICache) {}

  /**
   * Warm cache with data
   */
  async warm<T>(
    key: string,
    loader: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    try {
      const data = await loader();
      await this.cache.set(key, data, ttl);
      this.logger.log(`Warmed cache for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to warm cache for key ${key}: ${error}`);
    }
  }

  /**
   * Warm multiple cache entries
   */
  async warmBatch(
    entries: Array<{
      key: string;
      loader: () => Promise<unknown>;
      ttl?: number;
    }>
  ): Promise<void> {
    const results = await Promise.allSettled(
      entries.map((entry) => this.warm(entry.key, entry.loader, entry.ttl))
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(
        `Failed to warm ${failed}/${entries.length} cache entries`
      );
    } else {
      this.logger.log(`Successfully warmed ${entries.length} cache entries`);
    }
  }
}
