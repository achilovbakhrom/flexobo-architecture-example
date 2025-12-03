import { Injectable, Logger } from '@nestjs/common';
import { AggregateRoot } from '../../domain/aggregate-root';
import {
  ISnapshotRepository,
  Snapshot,
  SnapshotStrategy,
} from './snapshot.interface';

/**
 * Service for managing aggregate snapshots
 * Provides high-level operations for creating and loading snapshots
 */
@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);
  private readonly strategy: SnapshotStrategy;

  constructor(
    private readonly repository: ISnapshotRepository,
    strategy?: SnapshotStrategy
  ) {
    this.strategy = {
      snapshotFrequency: strategy?.snapshotFrequency || 20,
      keepLatestSnapshots: strategy?.keepLatestSnapshots || 2,
      enabled: strategy?.enabled !== false,
      expirationDays: strategy?.expirationDays || 30,
    };
  }

  /**
   * Create a snapshot from an aggregate
   * This should be called after persisting events
   */
  async createSnapshot<T extends AggregateRoot>(
    aggregate: T,
    aggregateType: string
  ): Promise<Snapshot<unknown> | null> {
    if (!this.strategy.enabled) {
      this.logger.debug('Snapshot creation disabled');
      return null;
    }

    const version = aggregate.version;
    const aggregateId = (aggregate as { id: string }).id;

    this.logger.debug(
      `Checking snapshot for ${aggregateType}:${aggregateId} at version ${version} (frequency: ${this.strategy.snapshotFrequency})`
    );

    // Check if we should create a snapshot
    if (!this.shouldCreateSnapshot(version)) {
      return null;
    }

    // Serialize aggregate state
    const state = this.serializeAggregate(aggregate);

    // Save snapshot
    const snapshot = await this.repository.save({
      aggregateId,
      aggregateType,
      data: state,
      version,
      expiresAt: this.calculateExpiration(),
    });

    // Prune old snapshots
    await this.repository.pruneOldSnapshots(
      aggregateId,
      this.strategy.keepLatestSnapshots || 2
    );

    this.logger.log(
      `Created snapshot for ${aggregateType}:${aggregateId} at version ${version}`
    );

    return snapshot;
  }

  /**
   * Get the latest snapshot for an aggregate
   */
  async getLatestSnapshot<T>(aggregateId: string): Promise<Snapshot<T> | null> {
    return this.repository.getLatest<T>(aggregateId);
  }

  /**
   * Check if a snapshot should be created based on current version
   */
  shouldCreateSnapshot(currentVersion: number): boolean {
    return this.repository.shouldCreateSnapshot(currentVersion, this.strategy);
  }

  /**
   * Delete all snapshots for an aggregate
   * Useful when deleting an aggregate
   */
  async deleteSnapshots(aggregateId: string): Promise<void> {
    await this.repository.deleteForAggregate(aggregateId);
    this.logger.debug(`Deleted snapshots for aggregate ${aggregateId}`);
  }

  /**
   * Clean up expired snapshots
   * Should be called periodically by a scheduled job
   */
  async cleanupExpiredSnapshots(): Promise<number> {
    const count = await this.repository.deleteExpired();
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired snapshots`);
    }
    return count;
  }

  /**
   * Get snapshot statistics
   */
  async getStatistics(): Promise<{
    totalSnapshots: number;
    snapshotFrequency: number;
    keepLatestSnapshots: number;
    enabled: boolean;
  }> {
    // This is a simplified version - in production, you'd query actual counts
    return {
      totalSnapshots: 0, // Would need a count query
      snapshotFrequency: this.strategy.snapshotFrequency || 20,
      keepLatestSnapshots: this.strategy.keepLatestSnapshots || 2,
      enabled: this.strategy.enabled !== false,
    };
  }

  /**
   * Serialize aggregate to plain object
   * Override this method if you need custom serialization
   */
  protected serializeAggregate<T extends AggregateRoot>(aggregate: T): unknown {
    // Default implementation: use JSON serialization
    // In production, you might want to use a more sophisticated approach
    return JSON.parse(JSON.stringify(aggregate));
  }

  /**
   * Calculate expiration date based on strategy
   */
  private calculateExpiration(): Date {
    const date = new Date();
    date.setDate(date.getDate() + (this.strategy.expirationDays || 30));
    return date;
  }

  /**
   * Get the configured strategy
   */
  getStrategy(): SnapshotStrategy {
    return { ...this.strategy };
  }
}
