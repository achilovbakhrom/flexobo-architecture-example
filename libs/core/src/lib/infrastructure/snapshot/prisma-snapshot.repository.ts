import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ISnapshotRepository,
  Snapshot,
  SnapshotStrategy,
} from './snapshot.interface';

interface SnapshotRecord {
  id: string;
  aggregateId: string;
  aggregateType: string;
  snapshotData: unknown;
  version: number;
  createdAt: Date;
  expiresAt: Date | null;
}

interface SnapshotPrismaClient {
  snapshot: {
    upsert: (args: {
      where: { aggregateId: string };
      create: {
        aggregateId: string;
        aggregateType: string;
        snapshotData: Record<string, never>;
        version: number;
        expiresAt: Date;
      };
      update: {
        aggregateType: string;
        snapshotData: Record<string, never>;
        version: number;
        expiresAt: Date;
      };
    }) => Promise<SnapshotRecord>;
    findUnique: (args: {
      where: { aggregateId: string };
    }) => Promise<SnapshotRecord | null>;
    findMany: (args: {
      where: { aggregateId: string };
      orderBy: { version: 'asc' | 'desc' };
      select?: { id: boolean };
    }) => Promise<SnapshotRecord[] | { id: string }[]>;
    deleteMany: (args: {
      where: {
        id?: { in: string[] };
        expiresAt?: { lt: Date };
        aggregateId?: string;
      };
    }) => Promise<{ count: number }>;
  };
}

export const SNAPSHOT_PRISMA_CLIENT = Symbol('SNAPSHOT_PRISMA_CLIENT');

@Injectable()
export class PrismaSnapshotRepository implements ISnapshotRepository {
  private readonly logger = new Logger(PrismaSnapshotRepository.name);

  constructor(
    @Inject(SNAPSHOT_PRISMA_CLIENT)
    private readonly prisma: SnapshotPrismaClient
  ) {}

  async save<T>(
    snapshot: Omit<Snapshot<T>, 'id' | 'createdAt'>
  ): Promise<Snapshot<T>> {
    const expiresAt = snapshot.expiresAt || this.calculateExpiration(30);

    // Use upsert since aggregateId is unique - we keep only the latest snapshot per aggregate
    const saved = await this.prisma.snapshot.upsert({
      where: { aggregateId: snapshot.aggregateId },
      create: {
        aggregateId: snapshot.aggregateId,
        aggregateType: snapshot.aggregateType,
        snapshotData: snapshot.data as Record<string, never>,
        version: snapshot.version,
        expiresAt,
      },
      update: {
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
    const snapshots = (await this.prisma.snapshot.findMany({
      where: { aggregateId },
      orderBy: { version: 'desc' },
    })) as SnapshotRecord[];

    return snapshots.map((s) => ({
      id: s.id,
      aggregateId: s.aggregateId,
      aggregateType: s.aggregateType,
      data: s.snapshotData as T,
      version: s.version,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt || undefined,
    }));
  }

  async pruneOldSnapshots(
    aggregateId: string,
    keepLatest: number
  ): Promise<number> {
    const snapshots = (await this.prisma.snapshot.findMany({
      where: { aggregateId },
      orderBy: { version: 'desc' },
      select: { id: true },
    })) as { id: string }[];

    if (snapshots.length <= keepLatest) {
      return 0;
    }

    const idsToDelete = snapshots.slice(keepLatest).map((s) => s.id);

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

    return currentVersion > 0 && currentVersion % snapshotFrequency === 0;
  }

  private calculateExpiration(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}
