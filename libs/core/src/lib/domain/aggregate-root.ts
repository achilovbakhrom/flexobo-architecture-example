import { DomainEvent } from './domain-event.interface';

/**
 * Base class for all Aggregate Roots in the domain
 * Aggregates are consistency boundaries that encapsulate business logic
 * and produce domain events
 */
export abstract class AggregateRoot {
  /**
   * Unique identifier of the aggregate
   */
  protected _id: string;

  /**
   * Current version of the aggregate (increments with each event)
   */
  protected _version = 0;

  /**
   * Collection of uncommitted events produced by the aggregate
   * These events will be persisted to the event store
   */
  private uncommittedEvents: DomainEvent[] = [];

  /**
   * Creates an instance of AggregateRoot
   * @param id Unique identifier
   */
  constructor(id: string) {
    this._id = id;
  }

  /**
   * Gets the aggregate's unique identifier
   */
  get id(): string {
    return this._id;
  }

  /**
   * Gets the current version of the aggregate
   */
  get version(): number {
    return this._version;
  }

  /**
   * Gets all uncommitted events
   */
  getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Marks all uncommitted events as committed
   * Should be called after successfully persisting events to the event store
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  /**
   * Adds a domain event to the uncommitted events collection
   * @param event The domain event to add
   */
  protected addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
    this._version++;
  }

  /**
   * Applies an event to the aggregate's state
   * This method should be overridden in derived classes to handle specific events
   * @param event The event to apply
   */
  protected abstract apply(event: DomainEvent): void;

  /**
   * Loads the aggregate from its event history
   * @param events Historical events to replay
   */
  loadFromHistory(events: DomainEvent[]): void {
    events.forEach((event) => {
      this.apply(event);
      this._version = event.version;
    });
  }

  /**
   * Creates a new domain event with proper metadata
   * @param eventType The type/name of the event
   * @param data The event payload
   * @param metadata Optional metadata
   */
  protected createEvent(
    eventType: string,
    data: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): DomainEvent {
    return {
      type: eventType,
      aggregateId: this._id,
      aggregateType: this.constructor.name,
      version: this._version + 1,
      occurredAt: new Date(),
      data,
      metadata,
    };
  }
}
