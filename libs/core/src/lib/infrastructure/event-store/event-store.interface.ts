import { DomainEvent } from '../../domain';

/**
 * Represents a stored event in the event store
 */
export interface StoredEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  version: number;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for event store implementations
 * Event store is the source of truth for all domain events
 */
export interface IEventStore {
  /**
   * Appends events to the event store
   * @param aggregateId The aggregate identifier
   * @param events The events to append
   * @param expectedVersion The expected current version (for optimistic concurrency)
   */
  append(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void>;

  /**
   * Gets all events for an aggregate
   * @param aggregateId The aggregate identifier
   */
  getEvents(aggregateId: string): Promise<StoredEvent[]>;

  /**
   * Gets events for an aggregate starting from a specific version (exclusive)
   * Used for snapshot-based loading: load snapshot at version N, then get events > N
   * @param aggregateId The aggregate identifier
   * @param fromVersion Get events with version > fromVersion
   */
  getEventsFromVersion(
    aggregateId: string,
    fromVersion: number
  ): Promise<StoredEvent[]>;

  /**
   * Gets events by event type
   * @param eventType The event type to filter by
   * @param limit Optional limit
   * @param offset Optional offset for pagination
   */
  getEventsByType(
    eventType: string,
    limit?: number,
    offset?: number
  ): Promise<StoredEvent[]>;

  /**
   * Gets events by aggregate type
   * @param aggregateType The aggregate type to filter by
   * @param limit Optional limit
   * @param offset Optional offset for pagination
   */
  getEventsByAggregateType(
    aggregateType: string,
    limit?: number,
    offset?: number
  ): Promise<StoredEvent[]>;

  /**
   * Gets events within a date range
   * @param from Start date
   * @param to End date
   * @param aggregateType Optional filter by aggregate type
   */
  getEventsByDateRange(
    from: Date,
    to: Date,
    aggregateType?: string
  ): Promise<StoredEvent[]>;
}
