/**
 * Order Repository Port (Secondary/Driven Port)
 *
 * This port defines the contract for order aggregate persistence.
 * It uses DTOs to decouple the application layer from infrastructure.
 *
 * The adapter implements this port and works with the event store.
 * The application layer converts between DTOs and domain entities.
 */

import { StoredEventDto } from '../application/dto/order.dto';

/**
 * Repository port for Order aggregate event persistence
 *
 * This port works with events, not domain entities.
 * The application layer is responsible for:
 * - Reconstructing domain aggregates from events
 * - Converting aggregate events to storable format
 */
export interface IOrderEventRepository {
  /**
   * Get all events for an order aggregate
   * @param orderId The order identifier
   * @returns Array of stored events
   */
  getEvents(orderId: string): Promise<StoredEventDto[]>;

  /**
   * Append events to the event store
   * @param orderId The order identifier
   * @param events Events to append
   * @param expectedVersion For optimistic concurrency
   */
  appendEvents(
    orderId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void>;

  /**
   * Check if an order exists (has any events)
   * @param orderId The order identifier
   */
  exists(orderId: string): Promise<boolean>;
}

export const ORDER_EVENT_REPOSITORY = Symbol('IOrderEventRepository');
