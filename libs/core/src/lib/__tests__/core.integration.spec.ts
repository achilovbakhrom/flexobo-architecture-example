/**
 * Integration Tests for Core Library
 *
 * Tests infrastructure components: Event Store, Outbox, Cache, etc.
 */

import {
  IEventStore,
  StoredEvent,
} from '../infrastructure/event-store/event-store.interface';
import { OutboxService } from '../infrastructure/outbox/outbox.service';
import {
  IOutboxRepository,
  OutboxMessage,
  OutboxMessageStatus,
} from '../infrastructure/outbox/outbox-message.interface';
import { ICache } from '../infrastructure/cache/cache.interface';
import { CircuitBreaker } from '../infrastructure/resilience/circuit-breaker';
import { DomainEvent } from '../domain/domain-event.interface';

// Mock implementations for testing
class InMemoryEventStore implements IEventStore {
  private events: Map<string, StoredEvent[]> = new Map();
  private allEvents: StoredEvent[] = [];

  async append(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void> {
    const existing = this.events.get(aggregateId) || [];
    if (existing.length !== expectedVersion) {
      throw new Error('Optimistic concurrency check failed');
    }

    const newEvents: StoredEvent[] = events.map((e, index) => ({
      id: `evt-${Date.now()}-${index}`,
      aggregateId: e.aggregateId,
      aggregateType: e.aggregateType,
      eventType: e.type,
      eventData: e.data,
      version: expectedVersion + index + 1,
      occurredAt: e.occurredAt,
      metadata: e.metadata,
    }));

    this.events.set(aggregateId, [...existing, ...newEvents]);
    this.allEvents.push(...newEvents);
  }

  async getEvents(aggregateId: string): Promise<StoredEvent[]> {
    return this.events.get(aggregateId) || [];
  }

  async getEventsByType(
    eventType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _limit?: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _offset?: number
  ): Promise<StoredEvent[]> {
    return this.allEvents.filter((e) => e.eventType === eventType);
  }

  async getEventsByAggregateType(
    aggregateType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _limit?: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _offset?: number
  ): Promise<StoredEvent[]> {
    return this.allEvents.filter((e) => e.aggregateType === aggregateType);
  }

  async getEventsByDateRange(
    from: Date,
    to: Date,
    aggregateType?: string
  ): Promise<StoredEvent[]> {
    return this.allEvents.filter(
      (e) =>
        e.occurredAt >= from &&
        e.occurredAt <= to &&
        (!aggregateType || e.aggregateType === aggregateType)
    );
  }
}

class InMemoryOutboxRepository implements IOutboxRepository {
  private messages: OutboxMessage[] = [];
  private idCounter = 1;

  async save(
    message: Omit<
      OutboxMessage,
      'id' | 'createdAt' | 'processedAt' | 'publishedAt' | 'error'
    >
  ): Promise<OutboxMessage> {
    const savedMessage: OutboxMessage = {
      ...message,
      id: `msg-${this.idCounter++}`,
      createdAt: new Date(),
    };
    this.messages.push(savedMessage);
    return savedMessage;
  }

  async findPendingMessages(batchSize: number): Promise<OutboxMessage[]> {
    return this.messages
      .filter((m) => m.status === OutboxMessageStatus.PENDING)
      .slice(0, batchSize);
  }

  async markAsProcessing(id: string): Promise<void> {
    const message = this.messages.find((m) => m.id === id);
    if (message) {
      message.status = OutboxMessageStatus.PROCESSING;
      message.processedAt = new Date();
    }
  }

  async markAsPublished(id: string): Promise<void> {
    const message = this.messages.find((m) => m.id === id);
    if (message) {
      message.status = OutboxMessageStatus.PUBLISHED;
      message.publishedAt = new Date();
    }
  }

  async markAsFailed(id: string, error: string): Promise<void> {
    const message = this.messages.find((m) => m.id === id);
    if (message) {
      message.status = OutboxMessageStatus.FAILED;
      message.error = error;
      message.retryCount++;
    }
  }

  async findByStatus(
    status: OutboxMessageStatus,
    limit?: number
  ): Promise<OutboxMessage[]> {
    const filtered = this.messages.filter((m) => m.status === status);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deletePublished(_olderThan: Date): Promise<number> {
    const before = this.messages.length;
    this.messages = this.messages.filter(
      (m) => m.status !== OutboxMessageStatus.PUBLISHED
    );
    return before - this.messages.length;
  }

  async findRetryableMessages(batchSize: number): Promise<OutboxMessage[]> {
    return this.messages
      .filter(
        (m) =>
          m.status === OutboxMessageStatus.FAILED && m.retryCount < m.maxRetries
      )
      .slice(0, batchSize);
  }
}

class InMemoryCacheService implements ICache {
  private cache: Map<string, { value: unknown; expiry: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  async expire(key: string, ttl: number): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      item.expiry = Date.now() + ttl * 1000;
    }
  }

  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);
    if (!item) return -2;
    const remaining = Math.floor((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((key) => this.get<T>(key)));
  }

  async mset(entries: Record<string, unknown>, ttl = 3600): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, ttl);
    }
  }

  async incr(key: string): Promise<number> {
    const value = await this.get<number>(key);
    const newValue = (value || 0) + 1;
    await this.set(key, newValue);
    return newValue;
  }

  async decr(key: string): Promise<number> {
    const value = await this.get<number>(key);
    const newValue = (value || 0) - 1;
    await this.set(key, newValue);
    return newValue;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }
}

describe('Core Library Integration Tests', () => {
  describe('Event Store', () => {
    let eventStore: IEventStore;

    beforeEach(() => {
      eventStore = new InMemoryEventStore();
    });

    it('should append and retrieve events', async () => {
      const aggregateId = 'test-aggregate-1';
      const events: DomainEvent[] = [
        {
          type: 'TestEvent',
          aggregateId,
          aggregateType: 'TestAggregate',
          version: 1,
          data: { value: 'test1' },
          metadata: { userId: 'user1' },
          occurredAt: new Date(),
        },
        {
          type: 'TestEvent',
          aggregateId,
          aggregateType: 'TestAggregate',
          version: 2,
          data: { value: 'test2' },
          metadata: { userId: 'user1' },
          occurredAt: new Date(),
        },
      ];

      await eventStore.append(aggregateId, events, 0);

      const retrieved = await eventStore.getEvents(aggregateId);
      expect(retrieved.length).toBe(2);
      expect(retrieved[0].eventData).toEqual({ value: 'test1' });
      expect(retrieved[1].eventData).toEqual({ value: 'test2' });
    });

    it('should enforce optimistic locking', async () => {
      const aggregateId = 'test-aggregate-2';
      const event: DomainEvent = {
        type: 'TestEvent',
        aggregateId,
        aggregateType: 'TestAggregate',
        version: 1,
        data: { value: 'test' },
        metadata: {},
        occurredAt: new Date(),
      };

      await eventStore.append(aggregateId, [event], 0);

      // Try to append with wrong expected version
      await expect(eventStore.append(aggregateId, [event], 0)).rejects.toThrow(
        'Optimistic concurrency check failed'
      );
    });

    it('should get events by type', async () => {
      const aggregateId = 'test-aggregate-3';
      const events: DomainEvent[] = [
        {
          type: 'EventTypeA',
          aggregateId,
          aggregateType: 'TestAggregate',
          version: 1,
          data: { value: 'a' },
          metadata: {},
          occurredAt: new Date(),
        },
        {
          type: 'EventTypeB',
          aggregateId,
          aggregateType: 'TestAggregate',
          version: 2,
          data: { value: 'b' },
          metadata: {},
          occurredAt: new Date(),
        },
      ];

      await eventStore.append(aggregateId, events, 0);

      const typeA = await eventStore.getEventsByType('EventTypeA');
      expect(typeA.length).toBe(1);
      expect(typeA[0].eventType).toBe('EventTypeA');
    });
  });

  describe('Outbox Pattern', () => {
    let outboxService: OutboxService;
    let outboxRepository: IOutboxRepository;

    beforeEach(() => {
      outboxRepository = new InMemoryOutboxRepository();
      outboxService = new OutboxService(outboxRepository);
    });

    it('should save and retrieve outbox messages', async () => {
      const event: DomainEvent = {
        type: 'TestEvent',
        aggregateId: 'agg-1',
        aggregateType: 'TestAggregate',
        version: 1,
        data: { value: 'test' },
        metadata: {},
        occurredAt: new Date(),
      };

      await outboxService.saveEvent(event, 'agg-1', 'TestAggregate');

      const pending = await outboxRepository.findPendingMessages(10);
      expect(pending.length).toBe(1);
      expect(pending[0].payload).toHaveProperty('value', 'test');
    });

    it('should mark messages as published', async () => {
      const event: DomainEvent = {
        type: 'TestEvent',
        aggregateId: 'agg-2',
        aggregateType: 'TestAggregate',
        version: 1,
        data: { value: 'test' },
        metadata: {},
        occurredAt: new Date(),
      };

      await outboxService.saveEvent(event, 'agg-2', 'TestAggregate');
      const pending = await outboxRepository.findPendingMessages(10);
      const messageId = pending[0].id;

      await outboxRepository.markAsPublished(messageId);

      const stillPending = await outboxRepository.findPendingMessages(10);
      expect(stillPending.length).toBe(0);
    });
  });

  describe('Cache Service', () => {
    let cacheService: ICache;

    beforeEach(() => {
      cacheService = new InMemoryCacheService();
    });

    it('should set and get values', async () => {
      await cacheService.set('key1', { value: 'test' }, 60);
      const result = await cacheService.get<{ value: string }>('key1');
      expect(result).toEqual({ value: 'test' });
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      await cacheService.set('key2', { value: 'test' }, 60);
      await cacheService.del('key2');
      const result = await cacheService.get('key2');
      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      await cacheService.set('key3', { value: 'test' }, 60);
      expect(await cacheService.exists('key3')).toBe(true);
      expect(await cacheService.exists('non-existent')).toBe(false);
    });

    it('should clear all values', async () => {
      await cacheService.set('key1', 'value1', 60);
      await cacheService.set('key2', 'value2', 60);
      await cacheService.clear();
      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();
    });
  });

  describe('Circuit Breaker', () => {
    it('should allow requests when circuit is closed', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-breaker',
        failureThreshold: 3,
        resetTimeout: 1000,
        timeout: 100,
      });

      const result = await breaker.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should open circuit after threshold failures', async () => {
      const breaker = new CircuitBreaker({
        name: 'failing-breaker',
        failureThreshold: 3,
        resetTimeout: 1000,
        timeout: 100,
      });

      // Cause 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Circuit should be open now
      await expect(
        breaker.execute(() => Promise.resolve('test'))
      ).rejects.toThrow();
    });

    it('should handle slow operations', async () => {
      const breaker = new CircuitBreaker({
        name: 'slow-breaker',
        failureThreshold: 3,
        resetTimeout: 1000,
        timeout: 50,
      });

      await expect(
        breaker.execute(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        )
      ).rejects.toThrow();
    });

    it('should transition to half-open state after reset timeout', async () => {
      const breaker = new CircuitBreaker({
        name: 'reset-breaker',
        failureThreshold: 2,
        resetTimeout: 100,
        timeout: 50,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should allow one request in half-open state
      const result = await breaker.execute(() => Promise.resolve('recovered'));
      expect(result).toBe('recovered');
    });
  });
});
