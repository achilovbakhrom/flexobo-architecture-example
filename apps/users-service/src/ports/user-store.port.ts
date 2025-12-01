import { DomainEvent } from '@flexobo/core';
import { User } from '../domain/user.aggregate';

/**
 * Port interface for Order Aggregate Store
 *
 * Following Go gaze-executor pattern:
 * - Store handles loading aggregates from event store
 * - Store handles saving uncommitted events to event store + publishing to broker
 * - Projections (separate) handle updating read models
 */
export interface IUserAggregateStore {
  /**
   * Load an order aggregate from event store
   * Uses snapshots when available for performance
   */
  load(userId: string): Promise<User | null>;

  /**
   * Check if an order exists in event store
   */
  exists(userId: string): Promise<boolean>;

  /**
   * Save order aggregate - persists uncommitted events to event store
   * and publishes to message broker via outbox
   *
   * Projections will handle:
   * - Updating read models
   * - Creating snapshots
   */
  save(user: User): Promise<DomainEvent[]>;
}

export const USER_AGGREGATE_STORE = Symbol('IUserAggregateStore');
