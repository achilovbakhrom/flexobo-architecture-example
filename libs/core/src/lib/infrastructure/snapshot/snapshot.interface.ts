/**
 * Snapshot represents the state of an aggregate at a specific version.
 * Snapshots optimize aggregate loading by avoiding replay of all events.
 *
 * Strategy: Create snapshot every N events (e.g., every 20 events)
 * Loading: Load latest snapshot + replay events since snapshot
 */
export interface Snapshot<T = unknown> {
  /**
   * Unique identifier for the snapshot
   */
  id: string;

  /**
   * ID of the aggregate this snapshot represents
   */
  aggregateId: string;

  /**
   * Type of aggregate (e.g., 'Truck', 'Load', 'User')
   */
  aggregateType: string;

  /**
   * The aggregate state at this version
   */
  data: T;

  /**
   * Version of the aggregate when this snapshot was taken
   */
  version: number;

  /**
   * Timestamp when the snapshot was created
   */
  createdAt: Date;

  /**
   * Optional expiration timestamp for auto-cleanup
   */
  expiresAt?: Date;

  /**
   * Metadata (compression info, size, etc.)
   */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for snapshot strategy
 */
export interface SnapshotStrategy {
  /**
   * Take snapshot every N events
   * Default: 20
   */
  snapshotFrequency?: number;

  /**
   * Keep only the latest N snapshots per aggregate
   * Older snapshots are automatically deleted
   * Default: 2
   */
  keepLatestSnapshots?: number;

  /**
   * Enable automatic snapshot creation
   * Default: true
   */
  enabled?: boolean;

  /**
   * Expire snapshots after N days
   * Default: 30
   */
  expirationDays?: number;
}

/**
 * Repository interface for snapshot operations
 */
export interface ISnapshotRepository {
  /**
   * Save a snapshot for an aggregate
   */
  save<T>(
    snapshot: Omit<Snapshot<T>, 'id' | 'createdAt'>
  ): Promise<Snapshot<T>>;

  /**
   * Get the latest snapshot for an aggregate
   */
  getLatest<T>(aggregateId: string): Promise<Snapshot<T> | null>;

  /**
   * Get all snapshots for an aggregate (for debugging)
   */
  getAll<T>(aggregateId: string): Promise<Snapshot<T>[]>;

  /**
   * Delete old snapshots for an aggregate, keeping only the latest N
   */
  pruneOldSnapshots(aggregateId: string, keepLatest: number): Promise<number>;

  /**
   * Delete expired snapshots across all aggregates
   */
  deleteExpired(): Promise<number>;

  /**
   * Delete all snapshots for an aggregate
   */
  deleteForAggregate(aggregateId: string): Promise<number>;

  /**
   * Check if a snapshot should be created based on strategy
   */
  shouldCreateSnapshot(
    currentVersion: number,
    strategy: SnapshotStrategy
  ): boolean;
}
