import { Injectable, Inject, Optional } from '@nestjs/common';
import { AggregateRoot } from '../../domain/aggregate-root';
import { DomainEvent } from '../../domain/domain-event.interface';
import { IEventStore } from '../event-store/event-store.interface';
import { OutboxService } from '../outbox/outbox.service';
import { SnapshotService } from '../snapshot/snapshot.service';

/**
 * Interface for aggregate stores
 * Used by command handlers to load and save aggregates
 */
export interface IAggregateStore<T extends AggregateRoot> {
  /**
   * Load an aggregate by ID from event store
   */
  load(aggregateId: string): Promise<T | null>;

  /**
   * Check if an aggregate exists in the event store
   */
  exists(aggregateId: string): Promise<boolean>;

  /**
   * Save aggregate - persists uncommitted events to event store and publishes to broker
   */
  save(aggregate: T): Promise<DomainEvent[]>;
}

/**
 * Configuration for aggregate snapshot restoration
 */
export interface AggregateRestorer<T extends AggregateRoot, TSnapshot> {
  /**
   * Restore aggregate from snapshot data and subsequent events
   */
  fromSnapshot(
    snapshotData: TSnapshot,
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): T;

  /**
   * Create aggregate from event history (when no snapshot available)
   */
  fromEvents(events: DomainEvent[]): T;
}

/**
 * AggregateStore - Core infrastructure for Event Sourcing
 *
 * Following the Go pattern from gaze-executor:
 * - Load: Loads aggregate from event store (with snapshot optimization)
 * - Save: Persists uncommitted events to event store + publishes to broker (via outbox)
 *
 * Command handlers use this store to:
 * 1. Load aggregate
 * 2. Execute domain logic (aggregate methods raise events)
 * 3. Save aggregate (persists events + publishes to broker)
 *
 * Projections (separate) listen to published events and update read models.
 * This separation ensures clean CQRS architecture.
 */
@Injectable()
export abstract class AggregateStore<
  T extends AggregateRoot,
  TSnapshot = unknown
> {
  constructor(
    @Inject('IEventStore') protected readonly eventStore: IEventStore,
    protected readonly outboxService: OutboxService,
    @Optional() protected readonly snapshotService?: SnapshotService
  ) {}

  /**
   * Get the aggregate type name (e.g., 'Order', 'Product')
   */
  protected abstract getAggregateType(): string;

  /**
   * Get the aggregate restorer for this aggregate type
   */
  protected abstract getAggregateRestorer(): AggregateRestorer<T, TSnapshot>;

  /**
   * Load an aggregate by ID from event store
   * Uses snapshot if available for better performance
   */
  async load(aggregateId: string): Promise<T | null> {
    const restorer = this.getAggregateRestorer();

    // Try to load from snapshot first for performance
    if (this.snapshotService) {
      const snapshot = await this.snapshotService.getLatestSnapshot<TSnapshot>(
        aggregateId
      );

      if (snapshot) {
        // Get only events after snapshot version
        const storedEvents = await this.eventStore.getEventsFromVersion(
          aggregateId,
          snapshot.version
        );

        const subsequentEvents = storedEvents.map((e) => ({
          type: e.eventType,
          aggregateId: e.aggregateId,
          aggregateType: e.aggregateType,
          version: e.version,
          occurredAt: e.occurredAt,
          data: e.eventData,
          metadata: e.metadata,
        }));

        return restorer.fromSnapshot(
          snapshot.data,
          snapshot.version,
          subsequentEvents
        );
      }
    }

    // Fallback: load all events and replay
    const storedEvents = await this.eventStore.getEvents(aggregateId);

    if (storedEvents.length === 0) {
      return null;
    }

    const events = storedEvents.map((e) => ({
      type: e.eventType,
      aggregateId: e.aggregateId,
      aggregateType: e.aggregateType,
      version: e.version,
      occurredAt: e.occurredAt,
      data: e.eventData,
      metadata: e.metadata,
    }));

    return restorer.fromEvents(events);
  }

  /**
   * Check if an aggregate exists in the event store
   */
  async exists(aggregateId: string): Promise<boolean> {
    const events = await this.eventStore.getEvents(aggregateId);
    return events.length > 0;
  }

  /**
   * Save aggregate - persists uncommitted events to event store and publishes to broker
   *
   * This method:
   * 1. Persists events to event store (source of truth)
   * 2. Saves events to outbox for reliable publishing to message broker
   * 3. Creates snapshot if needed (based on snapshot strategy)
   *
   * Returns the events that were saved.
   */
  async save(aggregate: T): Promise<DomainEvent[]> {
    const uncommittedEvents = aggregate.getUncommittedEvents();

    if (uncommittedEvents.length === 0) {
      return [];
    }

    const aggregateId = aggregate.id;
    const aggregateType = this.getAggregateType();
    const expectedVersion = aggregate.version - uncommittedEvents.length;

    // 1. Persist events to event store (source of truth)
    await this.eventStore.append(
      aggregateId,
      uncommittedEvents,
      expectedVersion
    );

    // 2. Save to outbox for reliable publishing to message broker
    // The outbox worker will publish these events to RabbitMQ
    // Projections subscribe to RabbitMQ and update read models
    await this.outboxService.saveEvents(
      uncommittedEvents,
      aggregateId,
      aggregateType
    );

    // 3. Mark events as committed on the aggregate
    aggregate.markEventsAsCommitted();

    // 4. Create snapshot if needed (based on snapshot frequency)
    if (this.snapshotService) {
      await this.snapshotService.createSnapshot(aggregate, aggregateType);
    }

    return uncommittedEvents;
  }
}
