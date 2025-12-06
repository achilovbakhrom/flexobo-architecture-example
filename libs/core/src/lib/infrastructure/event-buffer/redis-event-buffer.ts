import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { IEventBuffer } from './event-buffer.interface';
import { EventPayload } from '../../application/projections/base-projection';

export const REDIS_EVENT_BUFFER_CLIENT = Symbol('REDIS_EVENT_BUFFER_CLIENT');

/**
 * Configuration for Redis event buffer
 */
export interface RedisEventBufferConfig {
  /**
   * Key prefix for all event buffer keys
   */
  prefix?: string;

  /**
   * Default TTL for buffered events in seconds
   */
  eventTtl?: number;

  /**
   * Default lock TTL in milliseconds
   */
  lockTtlMs?: number;
}

/**
 * Redis-based event buffer for ordering out-of-sequence events
 *
 * Uses Redis data structures:
 * - Hash: {prefix}:version:{aggregateId} - stores current processed version
 * - Sorted Set: {prefix}:buffer:{aggregateId} - events sorted by version
 * - String: {prefix}:lock:{aggregateId} - distributed lock
 */
@Injectable()
export class RedisEventBuffer implements IEventBuffer {
  private readonly logger = new Logger(RedisEventBuffer.name);
  private readonly prefix: string;
  private readonly eventTtl: number;
  private readonly lockTtlMs: number;

  constructor(
    @Inject(REDIS_EVENT_BUFFER_CLIENT)
    private readonly redis: Redis,
    config: RedisEventBufferConfig = {}
  ) {
    this.prefix = config.prefix ?? 'evtbuf';
    this.eventTtl = config.eventTtl ?? 300; // 5 minutes default
    this.lockTtlMs = config.lockTtlMs ?? 5000; // 5 seconds default
  }

  /**
   * Build key for version tracking
   */
  private versionKey(aggregateId: string): string {
    return `${this.prefix}:version:${aggregateId}`;
  }

  /**
   * Build key for event buffer (sorted set)
   */
  private bufferKey(aggregateId: string): string {
    return `${this.prefix}:buffer:${aggregateId}`;
  }

  /**
   * Build key for lock
   */
  private lockKey(aggregateId: string): string {
    return `${this.prefix}:lock:${aggregateId}`;
  }

  /**
   * Get the current processed version for an aggregate
   */
  async getCurrentVersion(aggregateId: string): Promise<number> {
    const key = this.versionKey(aggregateId);
    const version = await this.redis.get(key);
    return version ? parseInt(version, 10) : 0;
  }

  /**
   * Set the current processed version for an aggregate
   */
  async setCurrentVersion(aggregateId: string, version: number): Promise<void> {
    const key = this.versionKey(aggregateId);
    // Set with expiry - version tracking should auto-cleanup
    await this.redis.setex(key, this.eventTtl * 10, version.toString());
  }

  /**
   * Add event to the buffer (waiting room)
   * Events are stored in a sorted set with version as score
   */
  async bufferEvent(
    aggregateId: string,
    event: EventPayload<unknown>
  ): Promise<void> {
    const key = this.bufferKey(aggregateId);
    const eventData: BufferedEventData = {
      event,
      receivedAt: Date.now(),
    };

    // Add to sorted set with version as score
    await this.redis.zadd(key, event.version, JSON.stringify(eventData));

    // Set expiry on the buffer key
    await this.redis.expire(key, this.eventTtl);

    this.logger.debug(
      `Buffered event v${event.version} for aggregate ${aggregateId}`
    );
  }

  /**
   * Get the next event from buffer if it matches expected version
   */
  async getNextEvent(
    aggregateId: string,
    expectedVersion: number
  ): Promise<EventPayload<unknown> | null> {
    const key = this.bufferKey(aggregateId);

    // Get event at the expected version score
    const results = await this.redis.zrangebyscore(
      key,
      expectedVersion,
      expectedVersion,
      'LIMIT',
      0,
      1
    );

    if (results.length === 0) {
      return null;
    }

    try {
      const data: BufferedEventData = JSON.parse(results[0]);
      return data.event;
    } catch (error) {
      this.logger.error(
        `Failed to parse buffered event for ${aggregateId}: ${error}`
      );
      return null;
    }
  }

  /**
   * Remove event from buffer after successful processing
   */
  async removeEvent(aggregateId: string, version: number): Promise<void> {
    const key = this.bufferKey(aggregateId);
    // Remove all events with this version score
    await this.redis.zremrangebyscore(key, version, version);
  }

  /**
   * Acquire a lock for processing an aggregate (distributed lock)
   * Uses SET NX with expiry for atomic lock acquisition
   */
  async acquireLock(aggregateId: string, ttlMs?: number): Promise<boolean> {
    const key = this.lockKey(aggregateId);
    const lockValue = `${process.pid}:${Date.now()}`;
    const ttl = ttlMs ?? this.lockTtlMs;

    // SET NX with PX (milliseconds expiry)
    const result = await this.redis.set(key, lockValue, 'PX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * Release lock for an aggregate
   */
  async releaseLock(aggregateId: string): Promise<void> {
    const key = this.lockKey(aggregateId);
    await this.redis.del(key);
  }

  /**
   * Clean up old buffered events
   * Removes events older than maxAgeMs from all buffers
   */
  async cleanupOldEvents(maxAgeMs: number): Promise<number> {
    const pattern = `${this.prefix}:buffer:*`;
    const keys = await this.redis.keys(pattern);
    let totalRemoved = 0;

    const cutoffTime = Date.now() - maxAgeMs;

    for (const key of keys) {
      // Get all events from the buffer
      const events = await this.redis.zrange(key, 0, -1);

      for (const eventStr of events) {
        try {
          const data: BufferedEventData = JSON.parse(eventStr);
          if (data.receivedAt < cutoffTime) {
            // Remove old event
            await this.redis.zrem(key, eventStr);
            totalRemoved++;
          }
        } catch {
          // Invalid data, remove it
          await this.redis.zrem(key, eventStr);
          totalRemoved++;
        }
      }
    }

    if (totalRemoved > 0) {
      this.logger.log(`Cleaned up ${totalRemoved} old buffered events`);
    }

    return totalRemoved;
  }

  /**
   * Get buffer statistics for an aggregate
   */
  async getBufferStats(aggregateId: string): Promise<{
    currentVersion: number;
    bufferedCount: number;
    bufferedVersions: number[];
  }> {
    const currentVersion = await this.getCurrentVersion(aggregateId);
    const bufferKey = this.bufferKey(aggregateId);

    // Get all scores (versions) in the buffer
    const members = await this.redis.zrange(bufferKey, 0, -1, 'WITHSCORES');
    const bufferedVersions: number[] = [];

    // Members come as [member1, score1, member2, score2, ...]
    for (let i = 1; i < members.length; i += 2) {
      bufferedVersions.push(parseInt(members[i], 10));
    }

    return {
      currentVersion,
      bufferedCount: bufferedVersions.length,
      bufferedVersions,
    };
  }
}

/**
 * Internal type for storing buffered event data
 */
interface BufferedEventData {
  event: EventPayload<unknown>;
  receivedAt: number;
}
