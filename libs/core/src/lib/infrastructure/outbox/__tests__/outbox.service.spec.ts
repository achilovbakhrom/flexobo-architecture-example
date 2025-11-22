import { Test, TestingModule } from '@nestjs/testing';
import { OutboxService, OutboxServiceConfig } from '../outbox.service';
import {
  IOutboxRepository,
  OutboxMessage,
  OutboxMessageStatus,
} from '../outbox-message.interface';
import { DomainEvent } from '../../../domain/domain-event.interface';

// Mock repository
class MockOutboxRepository implements IOutboxRepository {
  private messages: OutboxMessage[] = [];
  private idCounter = 1;

  async save(
    message: Omit<
      OutboxMessage,
      'id' | 'createdAt' | 'processedAt' | 'publishedAt' | 'error'
    >
  ): Promise<OutboxMessage> {
    const saved: OutboxMessage = {
      ...message,
      id: `msg-${this.idCounter++}`,
      createdAt: new Date(),
    };
    this.messages.push(saved);
    return saved;
  }

  async findPendingMessages(batchSize: number): Promise<OutboxMessage[]> {
    return this.messages
      .filter((m) => m.status === OutboxMessageStatus.PENDING)
      .slice(0, batchSize);
  }

  async markAsProcessing(id: string): Promise<void> {
    const message = this.messages.find((m) => m.id === id);
    if (message) {
      message.status = OutboxMessageStatus.PROCESSING;
      message.processedAt = new Date();
    }
  }

  async markAsPublished(id: string): Promise<void> {
    const message = this.messages.find((m) => m.id === id);
    if (message) {
      message.status = OutboxMessageStatus.PUBLISHED;
      message.publishedAt = new Date();
    }
  }

  async markAsFailed(id: string, error: string): Promise<void> {
    const message = this.messages.find((m) => m.id === id);
    if (message) {
      message.status = OutboxMessageStatus.FAILED;
      message.error = error;
      message.retryCount++;
    }
  }

  async findByStatus(
    status: OutboxMessageStatus,
    limit?: number
  ): Promise<OutboxMessage[]> {
    const filtered = this.messages.filter((m) => m.status === status);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async deletePublished(olderThan: Date): Promise<number> {
    const toDelete = this.messages.filter(
      (m) =>
        m.status === OutboxMessageStatus.PUBLISHED &&
        m.publishedAt &&
        m.publishedAt < olderThan
    );
    this.messages = this.messages.filter(
      (m) =>
        !(
          m.status === OutboxMessageStatus.PUBLISHED &&
          m.publishedAt &&
          m.publishedAt < olderThan
        )
    );
    return toDelete.length;
  }

  async findRetryableMessages(batchSize: number): Promise<OutboxMessage[]> {
    return this.messages
      .filter(
        (m) =>
          m.status === OutboxMessageStatus.FAILED && m.retryCount < m.maxRetries
      )
      .slice(0, batchSize);
  }

  // Test helper
  clear() {
    this.messages = [];
    this.idCounter = 1;
  }
}

describe('OutboxService', () => {
  let service: OutboxService;
  let repository: MockOutboxRepository;

  beforeEach(async () => {
    repository = new MockOutboxRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'IOutboxRepository',
          useValue: repository,
        },
        {
          provide: OutboxService,
          useFactory: (repo: IOutboxRepository) => {
            const config: OutboxServiceConfig = {
              maxRetries: 3,
              defaultCompanyId: 'test-company',
            };
            return new OutboxService(repo, config);
          },
          inject: ['IOutboxRepository'],
        },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  afterEach(() => {
    repository.clear();
  });

  describe('saveEvent', () => {
    it('should save a domain event to the outbox', async () => {
      const event: DomainEvent = {
        type: 'TruckCreated',
        aggregateId: 'truck-123',
        aggregateType: 'Truck',
        version: 1,
        occurredAt: new Date(),
        data: { licensePlate: 'ABC-123' },
      };

      const message = await service.saveEvent(
        event,
        'truck-123',
        'Truck',
        'company-1'
      );

      expect(message.id).toBeDefined();
      expect(message.aggregateId).toBe('truck-123');
      expect(message.aggregateType).toBe('Truck');
      expect(message.eventType).toBe('TruckCreated');
      expect(message.status).toBe(OutboxMessageStatus.PENDING);
      expect(message.retryCount).toBe(0);
      expect(message.maxRetries).toBe(3);
      expect(message.companyId).toBe('company-1');
    });

    it('should use default company ID if not provided', async () => {
      const event: DomainEvent = {
        type: 'TruckCreated',
        aggregateId: 'truck-123',
        aggregateType: 'Truck',
        version: 1,
        occurredAt: new Date(),
        data: {},
      };

      const message = await service.saveEvent(event, 'truck-123', 'Truck');

      expect(message.companyId).toBe('test-company');
    });
  });

  describe('saveEvents', () => {
    it('should save multiple events', async () => {
      const events: DomainEvent[] = [
        {
          type: 'TruckCreated',
          aggregateId: 'truck-123',
          aggregateType: 'Truck',
          version: 1,
          occurredAt: new Date(),
          data: {},
        },
        {
          type: 'TruckStatusChanged',
          aggregateId: 'truck-123',
          aggregateType: 'Truck',
          version: 2,
          occurredAt: new Date(),
          data: { status: 'ACTIVE' },
        },
      ];

      const messages = await service.saveEvents(
        events,
        'truck-123',
        'Truck',
        'company-1'
      );

      expect(messages).toHaveLength(2);
      expect(messages[0].eventType).toBe('TruckCreated');
      expect(messages[1].eventType).toBe('TruckStatusChanged');
    });
  });

  describe('getPendingMessages', () => {
    it('should return pending messages', async () => {
      const event: DomainEvent = {
        type: 'TruckCreated',
        aggregateId: 'truck-123',
        aggregateType: 'Truck',
        version: 1,
        occurredAt: new Date(),
        data: {},
      };

      await service.saveEvent(event, 'truck-123', 'Truck');
      await service.saveEvent(event, 'truck-456', 'Truck');

      const pending = await service.getPendingMessages(10);

      expect(pending).toHaveLength(2);
      expect(pending[0].status).toBe(OutboxMessageStatus.PENDING);
    });

    it('should respect batch size', async () => {
      const event: DomainEvent = {
        type: 'TruckCreated',
        aggregateId: 'truck-123',
        aggregateType: 'Truck',
        version: 1,
        occurredAt: new Date(),
        data: {},
      };

      for (let i = 0; i < 5; i++) {
        await service.saveEvent(event, `truck-${i}`, 'Truck');
      }

      const pending = await service.getPendingMessages(3);

      expect(pending).toHaveLength(3);
    });
  });

  describe('markAsPublished', () => {
    it('should mark message as published', async () => {
      const event: DomainEvent = {
        type: 'TruckCreated',
        aggregateId: 'truck-123',
        aggregateType: 'Truck',
        version: 1,
        occurredAt: new Date(),
        data: {},
      };

      const message = await service.saveEvent(event, 'truck-123', 'Truck');
      await service.markAsPublished(message.id);

      const published = await service.getMessagesByStatus(
        OutboxMessageStatus.PUBLISHED
      );
      expect(published).toHaveLength(1);
      expect(published[0].id).toBe(message.id);
    });
  });

  describe('markAsFailed', () => {
    it('should mark message as failed with error', async () => {
      const event: DomainEvent = {
        type: 'TruckCreated',
        aggregateId: 'truck-123',
        aggregateType: 'Truck',
        version: 1,
        occurredAt: new Date(),
        data: {},
      };

      const message = await service.saveEvent(event, 'truck-123', 'Truck');
      await service.markAsFailed(message.id, 'Connection timeout');

      const failed = await service.getMessagesByStatus(
        OutboxMessageStatus.FAILED
      );
      expect(failed).toHaveLength(1);
      expect(failed[0].error).toBe('Connection timeout');
      expect(failed[0].retryCount).toBe(1);
    });
  });

  describe('cleanupPublishedMessages', () => {
    it('should delete old published messages', async () => {
      const event: DomainEvent = {
        type: 'TruckCreated',
        aggregateId: 'truck-123',
        aggregateType: 'Truck',
        version: 1,
        occurredAt: new Date(),
        data: {},
      };

      const message = await service.saveEvent(event, 'truck-123', 'Truck');
      await service.markAsPublished(message.id);

      // Mock published date to be 8 days ago
      const messages = await repository.findByStatus(
        OutboxMessageStatus.PUBLISHED
      );
      if (messages[0].publishedAt) {
        messages[0].publishedAt = new Date(
          Date.now() - 8 * 24 * 60 * 60 * 1000
        );
      }

      const count = await service.cleanupPublishedMessages(7);

      expect(count).toBe(1);

      const remaining = await service.getMessagesByStatus(
        OutboxMessageStatus.PUBLISHED
      );
      expect(remaining).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('should return message statistics', async () => {
      const event: DomainEvent = {
        type: 'TruckCreated',
        aggregateId: 'truck-123',
        aggregateType: 'Truck',
        version: 1,
        occurredAt: new Date(),
        data: {},
      };

      await service.saveEvent(event, 'truck-1', 'Truck');
      await service.saveEvent(event, 'truck-2', 'Truck');

      const msg1 = await service.saveEvent(event, 'truck-3', 'Truck');
      await service.markAsPublished(msg1.id);

      const stats = await service.getStatistics();

      expect(stats.pending).toBeGreaterThan(0);
      expect(stats.published).toBeGreaterThan(0);
    });
  });
});
