import { Test, TestingModule } from '@nestjs/testing';
import { SnapshotService } from '../snapshot.service';
import {
  ISnapshotRepository,
  Snapshot,
  SnapshotStrategy,
} from '../snapshot.interface';
import { AggregateRoot } from '../../../domain/aggregate-root';

// Mock aggregate for testing
class TestAggregate extends AggregateRoot {
  private name: string;
  private status: string;

  constructor(id: string) {
    super(id);
    this.name = '';
    this.status = 'CREATED';
  }

  static create(id: string, name: string): TestAggregate {
    const aggregate = new TestAggregate(id);
    aggregate.name = name;
    aggregate['_version'] = 1;
    return aggregate;
  }

  changeName(newName: string) {
    this.name = newName;
    this['_version']++;
  }

  changeStatus(newStatus: string) {
    this.status = newStatus;
    this['_version']++;
  }

  setVersion(version: number) {
    this['_version'] = version;
  }

  getName(): string {
    return this.name;
  }

  getStatus(): string {
    return this.status;
  }

  protected apply(): void {
    // Not used in tests
  }
}

// Mock repository
class MockSnapshotRepository implements ISnapshotRepository {
  private snapshots: Map<string, Snapshot<unknown>[]> = new Map();
  private idCounter = 1;

  async save<T>(
    snapshot: Omit<Snapshot<T>, 'id' | 'createdAt'>
  ): Promise<Snapshot<T>> {
    const saved: Snapshot<T> = {
      ...snapshot,
      id: `snap-${this.idCounter++}`,
      createdAt: new Date(),
    };

    const aggregateSnapshots = this.snapshots.get(snapshot.aggregateId) || [];
    aggregateSnapshots.push(saved as Snapshot<unknown>);
    this.snapshots.set(snapshot.aggregateId, aggregateSnapshots);

    return saved;
  }

  async getLatest<T>(aggregateId: string): Promise<Snapshot<T> | null> {
    const aggregateSnapshots = this.snapshots.get(aggregateId);
    if (!aggregateSnapshots || aggregateSnapshots.length === 0) {
      return null;
    }

    // Return the latest snapshot (highest version)
    const sorted = [...aggregateSnapshots].sort(
      (a, b) => b.version - a.version
    );
    return sorted[0] as Snapshot<T>;
  }

  async getAll<T>(aggregateId: string): Promise<Snapshot<T>[]> {
    const aggregateSnapshots = this.snapshots.get(aggregateId) || [];
    return aggregateSnapshots.sort(
      (a, b) => b.version - a.version
    ) as Snapshot<T>[];
  }

  async pruneOldSnapshots(
    aggregateId: string,
    keepLatest: number
  ): Promise<number> {
    const aggregateSnapshots = this.snapshots.get(aggregateId);
    if (!aggregateSnapshots || aggregateSnapshots.length <= keepLatest) {
      return 0;
    }

    const sorted = [...aggregateSnapshots].sort(
      (a, b) => b.version - a.version
    );
    const toKeep = sorted.slice(0, keepLatest);
    const deletedCount = aggregateSnapshots.length - toKeep.length;

    this.snapshots.set(aggregateId, toKeep);
    return deletedCount;
  }

  async deleteExpired(): Promise<number> {
    let deletedCount = 0;
    const now = new Date();

    for (const [aggregateId, aggregateSnapshots] of this.snapshots) {
      const remaining = aggregateSnapshots.filter((s) => {
        if (s.expiresAt && s.expiresAt < now) {
          deletedCount++;
          return false;
        }
        return true;
      });
      this.snapshots.set(aggregateId, remaining);
    }

    return deletedCount;
  }

  async deleteForAggregate(aggregateId: string): Promise<number> {
    const aggregateSnapshots = this.snapshots.get(aggregateId);
    const count = aggregateSnapshots?.length || 0;
    this.snapshots.delete(aggregateId);
    return count;
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

  // Test helper
  clear() {
    this.snapshots.clear();
    this.idCounter = 1;
  }
}

describe('SnapshotService', () => {
  let service: SnapshotService;
  let repository: MockSnapshotRepository;

  beforeEach(async () => {
    repository = new MockSnapshotRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'ISnapshotRepository',
          useValue: repository,
        },
        {
          provide: SnapshotService,
          useFactory: (repo: ISnapshotRepository) => {
            const strategy: SnapshotStrategy = {
              snapshotFrequency: 5, // Snapshot every 5 events for testing
              keepLatestSnapshots: 2,
              enabled: true,
              expirationDays: 7,
            };
            return new SnapshotService(repo, strategy);
          },
          inject: ['ISnapshotRepository'],
        },
      ],
    }).compile();

    service = module.get<SnapshotService>(SnapshotService);
  });

  afterEach(() => {
    repository.clear();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot when version is a multiple of frequency', async () => {
      const aggregate = TestAggregate.create('test-1', 'Test Aggregate');
      aggregate.setVersion(5); // Multiple of 5

      const snapshot = await service.createSnapshot(aggregate, 'TestAggregate');

      expect(snapshot).toBeDefined();
      expect(snapshot?.aggregateId).toBe('test-1');
      expect(snapshot?.aggregateType).toBe('TestAggregate');
      expect(snapshot?.version).toBe(5);
    });

    it('should not create snapshot when version is not a multiple of frequency', async () => {
      const aggregate = TestAggregate.create('test-1', 'Test Aggregate');
      aggregate.setVersion(3); // Not a multiple of 5

      const snapshot = await service.createSnapshot(aggregate, 'TestAggregate');

      expect(snapshot).toBeNull();
    });

    it('should not create snapshot when disabled', async () => {
      // Create a service with snapshots disabled
      const disabledService = new SnapshotService(repository, {
        enabled: false,
        snapshotFrequency: 5,
      });

      const aggregate = TestAggregate.create('test-1', 'Test Aggregate');
      aggregate.setVersion(5);

      const snapshot = await disabledService.createSnapshot(
        aggregate,
        'TestAggregate'
      );

      expect(snapshot).toBeNull();
    });

    it('should prune old snapshots after creating a new one', async () => {
      const aggregate = TestAggregate.create('test-1', 'Test Aggregate');

      // Create 3 snapshots
      aggregate.setVersion(5);
      await service.createSnapshot(aggregate, 'TestAggregate');

      aggregate.setVersion(10);
      await service.createSnapshot(aggregate, 'TestAggregate');

      aggregate.setVersion(15);
      await service.createSnapshot(aggregate, 'TestAggregate');

      // Should keep only 2 latest
      const allSnapshots = await repository.getAll('test-1');
      expect(allSnapshots.length).toBe(2);
      expect(allSnapshots[0].version).toBe(15);
      expect(allSnapshots[1].version).toBe(10);
    });
  });

  describe('getLatestSnapshot', () => {
    it('should return the latest snapshot', async () => {
      const aggregate = TestAggregate.create('test-1', 'Test Aggregate');

      aggregate.setVersion(5);
      await service.createSnapshot(aggregate, 'TestAggregate');

      aggregate.setVersion(10);
      await service.createSnapshot(aggregate, 'TestAggregate');

      const snapshot = await service.getLatestSnapshot('test-1');

      expect(snapshot).toBeDefined();
      expect(snapshot?.version).toBe(10);
    });

    it('should return null if no snapshot exists', async () => {
      const snapshot = await service.getLatestSnapshot('non-existent');

      expect(snapshot).toBeNull();
    });
  });

  describe('shouldCreateSnapshot', () => {
    it('should return true for multiples of snapshot frequency', () => {
      expect(service.shouldCreateSnapshot(5)).toBe(true);
      expect(service.shouldCreateSnapshot(10)).toBe(true);
      expect(service.shouldCreateSnapshot(15)).toBe(true);
    });

    it('should return false for non-multiples', () => {
      expect(service.shouldCreateSnapshot(1)).toBe(false);
      expect(service.shouldCreateSnapshot(3)).toBe(false);
      expect(service.shouldCreateSnapshot(7)).toBe(false);
    });

    it('should return false for version 0', () => {
      expect(service.shouldCreateSnapshot(0)).toBe(false);
    });
  });

  describe('deleteSnapshots', () => {
    it('should delete all snapshots for an aggregate', async () => {
      const aggregate = TestAggregate.create('test-1', 'Test Aggregate');

      aggregate.setVersion(5);
      await service.createSnapshot(aggregate, 'TestAggregate');

      aggregate.setVersion(10);
      await service.createSnapshot(aggregate, 'TestAggregate');

      await service.deleteSnapshots('test-1');

      const snapshot = await service.getLatestSnapshot('test-1');
      expect(snapshot).toBeNull();
    });
  });

  describe('cleanupExpiredSnapshots', () => {
    it('should delete expired snapshots', async () => {
      // Create a snapshot with past expiration
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      await repository.save({
        aggregateId: 'test-1',
        aggregateType: 'TestAggregate',
        data: {},
        version: 5,
        expiresAt: pastDate,
      });

      const count = await service.cleanupExpiredSnapshots();

      expect(count).toBe(1);

      const snapshot = await service.getLatestSnapshot('test-1');
      expect(snapshot).toBeNull();
    });

    it('should not delete non-expired snapshots', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10); // 10 days in future

      await repository.save({
        aggregateId: 'test-1',
        aggregateType: 'TestAggregate',
        data: {},
        version: 5,
        expiresAt: futureDate,
      });

      const count = await service.cleanupExpiredSnapshots();

      expect(count).toBe(0);

      const snapshot = await service.getLatestSnapshot('test-1');
      expect(snapshot).toBeDefined();
    });
  });

  describe('getStatistics', () => {
    it('should return snapshot statistics', async () => {
      const stats = await service.getStatistics();

      expect(stats.snapshotFrequency).toBe(5);
      expect(stats.keepLatestSnapshots).toBe(2);
      expect(stats.enabled).toBe(true);
    });
  });

  describe('getStrategy', () => {
    it('should return the configured strategy', () => {
      const strategy = service.getStrategy();

      expect(strategy.snapshotFrequency).toBe(5);
      expect(strategy.keepLatestSnapshots).toBe(2);
      expect(strategy.enabled).toBe(true);
      expect(strategy.expirationDays).toBe(7);
    });
  });
});
