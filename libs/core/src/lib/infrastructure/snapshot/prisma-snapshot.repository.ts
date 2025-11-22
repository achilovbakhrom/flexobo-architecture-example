import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  ISnapshotRepository,
  Snapshot,
  SnapshotStrategy,
} from './snapshot.interface';

/**
 * Prisma-based implementation of snapshot repository
 */
@Injectable()
export class PrismaSnapshotRepository implements ISnapshotRepository {
  private readonly logger = new Logger(PrismaSnapshotRepository.name);

  constructor(private readonly prisma: PrismaClient) {}

  async save<T>(
    snapshot: Omit<Snapshot<T>, 'id' | 'createdAt'>
  ): Promise<Snapshot<T>> {
    const expiresAt = snapshot.expiresAt || this.calculateExpiration(30);

    const saved = await this.prisma.snapshot.create({
      data: {
        aggregateId: snapshot.aggregateId,
        aggregateType: snapshot.aggregateType,
        snapshotData: snapshot.data as Record<string, never>,
        version: snapshot.version,
        expiresAt,
      },
    });

    this.logger.debug(
      `Saved snapshot for ${snapshot.aggregateType}:${snapshot.aggregateId} at version ${snapshot.version}`
    );

    return {
      id: saved.id,
      aggregateId: saved.aggregateId,
      aggregateType: saved.aggregateType,
      data: saved.snapshotData as T,
      version: saved.version,
      createdAt: saved.createdAt,
      expiresAt: saved.expiresAt || undefined,
    };
  }

  async getLatest<T>(aggregateId: string): Promise<Snapshot<T> | null> {
    const snapshot = await this.prisma.snapshot.findUnique({
      where: { aggregateId },
    });

    if (!snapshot) {
      return null;
    }

    return {
      id: snapshot.id,
      aggregateId: snapshot.aggregateId,
      aggregateType: snapshot.aggregateType,
      data: snapshot.snapshotData as T,
      version: snapshot.version,
      createdAt: snapshot.createdAt,
      expiresAt: snapshot.expiresAt || undefined,
    };
  }

  async getAll<T>(aggregateId: string): Promise<Snapshot<T>[]> {
    const snapshots = await this.prisma.snapshot.findMany({
      where: { aggregateId },
      orderBy: { version: 'desc' },
    });

    return snapshots.map(
      (s: {
        id: string;
        aggregateId: string;
        aggregateType: string;
        snapshotData: unknown;
        version: number;
        createdAt: Date;
        expiresAt: Date | null;
      }): Snapshot<T> => ({
        id: s.id,
        aggregateId: s.aggregateId,
        aggregateType: s.aggregateType,
        data: s.snapshotData as T,
        version: s.version,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt || undefined,
      })
    );
  }

  async pruneOldSnapshots(
    aggregateId: string,
    keepLatest: number
  ): Promise<number> {
    // Get all snapshots for the aggregate, ordered by version desc
    const snapshots = await this.prisma.snapshot.findMany({
      where: { aggregateId },
      orderBy: { version: 'desc' },
      select: { id: true },
    });

    // Keep the latest N, delete the rest
    if (snapshots.length <= keepLatest) {
      return 0;
    }

    const idsToDelete = snapshots
      .slice(keepLatest)
      .map((s: { id: string }) => s.id);

    const result = await this.prisma.snapshot.deleteMany({
      where: {
        id: { in: idsToDelete },
      },
    });

    this.logger.debug(
      `Pruned ${result.count} old snapshots for aggregate ${aggregateId}`
    );

    return result.count;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.snapshot.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} expired snapshots`);
    }

    return result.count;
  }

  async deleteForAggregate(aggregateId: string): Promise<number> {
    const result = await this.prisma.snapshot.deleteMany({
      where: { aggregateId },
    });

    this.logger.debug(
      `Deleted ${result.count} snapshots for aggregate ${aggregateId}`
    );

    return result.count;
  }

  shouldCreateSnapshot(
    currentVersion: number,
    strategy: SnapshotStrategy
  ): boolean {
    const { snapshotFrequency = 20, enabled = true } = strategy;

    if (!enabled) {
      return false;
    }

    // Create snapshot every N events
    return currentVersion > 0 && currentVersion % snapshotFrequency === 0;
  }

  /**
   * Calculate expiration date
   */
  private calculateExpiration(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}
