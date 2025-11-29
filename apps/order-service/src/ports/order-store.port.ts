import { DomainEvent } from '@flexobo/core';
import { Order } from '../domain/order.aggregate';

/**
 * Port interface for Order Aggregate Store
 *
 * Following Go gaze-executor pattern:
 * - Store handles loading aggregates from event store
 * - Store handles saving uncommitted events to event store + publishing to broker
 * - Projections (separate) handle updating read models
 */
export interface IOrderAggregateStore {
  /**
   * Load an order aggregate from event store
   * Uses snapshots when available for performance
   */
  load(orderId: string): Promise<Order | null>;

  /**
   * Check if an order exists in event store
   */
  exists(orderId: string): Promise<boolean>;

  /**
   * Save order aggregate - persists uncommitted events to event store
   * and publishes to message broker via outbox
   *
   * Projections will handle:
   * - Updating read models
   * - Creating snapshots
   */
  save(order: Order): Promise<DomainEvent[]>;
}

export const ORDER_AGGREGATE_STORE = Symbol('IOrderAggregateStore');
