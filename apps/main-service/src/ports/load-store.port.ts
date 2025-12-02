import { DomainEvent } from '@flexobo/core';
import { Load } from '../domain/load.aggregate';

/**
 * Port (Interface) for Load Aggregate Store
 * Handles loading and saving Load aggregates with event sourcing
 */
export interface ILoadAggregateStore {
  /**
   * Load a Load aggregate by ID from event store
   * @param loadId The unique identifier of the load
   * @returns The reconstructed Load aggregate or null if not found
   */
  load(loadId: string): Promise<Load | null>;

  /**
   * Check if a Load aggregate exists
   * @param loadId The unique identifier of the load
   * @returns True if the load exists
   */
  exists(loadId: string): Promise<boolean>;

  /**
   * Save a Load aggregate (persist its uncommitted events)
   * @param load The Load aggregate to save
   * @returns The persisted domain events
   */
  save(load: Load): Promise<DomainEvent[]>;
}

/**
 * Dependency Injection token for ILoadAggregateStore
 */
export const LOAD_AGGREGATE_STORE = Symbol('ILoadAggregateStore');
