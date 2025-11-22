/**
 * Base interface for all domain events
 * Domain events represent something that happened in the domain
 */
export interface DomainEvent {
  /**
   * The type/name of the event (e.g., 'UserRegistered', 'OrderCreated')
   */
  readonly type: string;

  /**
   * Unique identifier of the aggregate that produced this event
   */
  readonly aggregateId: string;

  /**
   * Type of the aggregate (e.g., 'User', 'Order')
   */
  readonly aggregateType: string;

  /**
   * Version number of this event in the aggregate's event stream
   */
  readonly version: number;

  /**
   * Timestamp when the event occurred
   */
  readonly occurredAt: Date;

  /**
   * Event payload containing the actual data
   */
  readonly data: Record<string, unknown>;

  /**
   * Optional metadata (userId who triggered it, correlation ID, etc.)
   */
  readonly metadata?: Record<string, unknown>;
}
