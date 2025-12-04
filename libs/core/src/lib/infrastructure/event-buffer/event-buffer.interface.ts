import { EventPayload } from '../../application/projections/base-projection';

/**
 * Buffered event with metadata for ordered processing
 */
export interface BufferedEvent<TEventPayload extends EventPayload = EventPayload> {
  event: TEventPayload;
  aggregateId: string;
  version: number;
  receivedAt: number;
}

/**
 * Event buffer interface for ordering out-of-sequence events
 */
export interface IEventBuffer {
  /**
   * Get the current processed version for an aggregate
   */
  getCurrentVersion(aggregateId: string): Promise<number>;

  /**
   * Set the current processed version for an aggregate
   */
  setCurrentVersion(aggregateId: string, version: number): Promise<void>;

  /**
   * Add event to the buffer (waiting room)
   */
  bufferEvent(
    aggregateId: string,
    event: EventPayload<unknown>
  ): Promise<void>;

  /**
   * Get the next event from buffer if it matches expected version
   */
  getNextEvent(
    aggregateId: string,
    expectedVersion: number
  ): Promise<EventPayload<unknown> | null>;

  /**
   * Remove event from buffer after successful processing
   */
  removeEvent(aggregateId: string, version: number): Promise<void>;

  /**
   * Acquire a lock for processing an aggregate (distributed lock)
   */
  acquireLock(aggregateId: string, ttlMs: number): Promise<boolean>;

  /**
   * Release lock for an aggregate
   */
  releaseLock(aggregateId: string): Promise<void>;

  /**
   * Clear old buffered events (cleanup)
   */
  cleanupOldEvents(maxAgeMs: number): Promise<number>;
}

export const EVENT_BUFFER = Symbol('EVENT_BUFFER');
