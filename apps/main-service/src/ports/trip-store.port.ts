import { DomainEvent } from '@flexobo/core';
import { Trip } from '../domain/trip.aggregate';

/**
 * Port (Interface) for Trip Aggregate Store
 * Handles loading and saving Trip aggregates with event sourcing
 */
export interface ITripAggregateStore {
  /**
   * Load a Trip aggregate by ID from event store
   * @param tripId The unique identifier of the trip
   * @returns The reconstructed Trip aggregate or null if not found
   */
  load(tripId: string): Promise<Trip | null>;

  /**
   * Check if a Trip aggregate exists
   * @param tripId The unique identifier of the trip
   * @returns True if the trip exists
   */
  exists(tripId: string): Promise<boolean>;

  /**
   * Save a Trip aggregate (persist its uncommitted events)
   * @param trip The Trip aggregate to save
   * @returns The persisted domain events
   */
  save(trip: Trip): Promise<DomainEvent[]>;
}

/**
 * Dependency Injection token for ITripAggregateStore
 */
export const TRIP_AGGREGATE_STORE = Symbol('ITripAggregateStore');
