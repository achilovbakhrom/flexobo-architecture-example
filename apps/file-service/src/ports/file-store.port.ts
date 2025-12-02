import { DomainEvent } from '@flexobo/core';
import { FileAggregate } from '../domain/aggregates/file.aggregate';

/**
 * File Aggregate Store Port
 *
 * Interface for persisting and loading file aggregates using event sourcing.
 */
export interface IFileAggregateStore {
  /**
   * Load a file aggregate by ID
   * @param fileId The file aggregate ID
   * @returns The file aggregate or null if not found
   */
  load(fileId: string): Promise<FileAggregate | null>;

  /**
   * Check if a file aggregate exists
   * @param fileId The file aggregate ID
   * @returns True if the aggregate exists
   */
  exists(fileId: string): Promise<boolean>;

  /**
   * Save a file aggregate (persists uncommitted events)
   * @param file The file aggregate to save
   * @returns The domain events that were persisted
   */
  save(file: FileAggregate): Promise<DomainEvent[]>;
}

export const FILE_AGGREGATE_STORE = Symbol('IFileAggregateStore');
