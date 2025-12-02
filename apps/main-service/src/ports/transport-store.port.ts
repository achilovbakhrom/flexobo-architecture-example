import { DomainEvent } from '@flexobo/core';
import { Transport } from '../domain/transport.aggregate';

/**
 * Port (Interface) for Transport Aggregate Store
 * Handles loading and saving Transport aggregates with event sourcing
 */
export interface ITransportAggregateStore {
  /**
   * Load a Transport aggregate by ID from event store
   * @param transportId The unique identifier of the transport
   * @returns The reconstructed Transport aggregate or null if not found
   */
  load(transportId: string): Promise<Transport | null>;

  /**
   * Check if a Transport aggregate exists
   * @param transportId The unique identifier of the transport
   * @returns True if the transport exists
   */
  exists(transportId: string): Promise<boolean>;

  /**
   * Save a Transport aggregate (persist its uncommitted events)
   * @param transport The Transport aggregate to save
   * @returns The persisted domain events
   */
  save(transport: Transport): Promise<DomainEvent[]>;
}

/**
 * Dependency Injection token for ITransportAggregateStore
 */
export const TRANSPORT_AGGREGATE_STORE = Symbol('ITransportAggregateStore');
