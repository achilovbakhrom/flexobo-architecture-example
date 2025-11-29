import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IOutboxRepository,
  OutboxMessage,
  OutboxMessageStatus,
} from './outbox-message.interface';

interface OutboxMessageRecord {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: unknown;
  status: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  processedAt: Date | null;
  publishedAt: Date | null;
  error: string | null;
  companyId: string | null;
  metadata: unknown | null;
}

interface OutboxPrismaClient {
  outboxMessage: {
    create: (args: {
      data: {
        aggregateId: string;
        aggregateType: string;
        eventType: string;
        payload: Record<string, never>;
        status: string;
        retryCount: number;
        maxRetries: number;
        companyId?: string;
        metadata?: Record<string, never>;
      };
    }) => Promise<OutboxMessageRecord>;
    update: (args: {
      where: { id: string };
      data: {
        status?: string;
        processedAt?: Date;
        publishedAt?: Date;
        error?: string;
        retryCount?: { increment: number };
      };
    }) => Promise<OutboxMessageRecord>;
    findMany: (args: {
      where: { status: string };
      orderBy: { createdAt: 'asc' | 'desc' };
      take: number;
    }) => Promise<OutboxMessageRecord[]>;
    deleteMany: (args: {
      where: {
        status: string;
        publishedAt?: { lt: Date };
      };
    }) => Promise<{ count: number }>;
  };
  $queryRaw: <T>(
    query: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>;
}

export const OUTBOX_PRISMA_CLIENT = Symbol('OUTBOX_PRISMA_CLIENT');

@Injectable()
export class PrismaOutboxRepository implements IOutboxRepository {
  private readonly logger = new Logger(PrismaOutboxRepository.name);

  constructor(
    @Inject(OUTBOX_PRISMA_CLIENT)
    private readonly prisma: OutboxPrismaClient
  ) {}

  async save(
    message: Omit<
      OutboxMessage,
      'id' | 'createdAt' | 'processedAt' | 'publishedAt' | 'error'
    >
  ): Promise<OutboxMessage> {
    const saved = await this.prisma.outboxMessage.create({
      data: {
        aggregateId: message.aggregateId,
        aggregateType: message.aggregateType,
        eventType: message.eventType,
        payload: message.payload as Record<string, never>,
        status: message.status,
        retryCount: message.retryCount,
        maxRetries: message.maxRetries,
        companyId: message.companyId,
        metadata: message.metadata as Record<string, never> | undefined,
      },
    });

    return this.toDomain(saved);
  }

  async findPendingMessages(batchSize: number): Promise<OutboxMessage[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM outbox_messages
      WHERE status = ${OutboxMessageStatus.PENDING}
      ORDER BY created_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return messages.map((m: any) =>
      this.toDomain(m as OutboxMessageRecord)
    );
  }

  async markAsProcessing(id: string): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: {
        status: OutboxMessageStatus.PROCESSING,
        processedAt: new Date(),
      },
    });

    this.logger.debug(`Marked message ${id} as processing`);
  }

  async markAsPublished(id: string): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: {
        status: OutboxMessageStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    this.logger.debug(`Marked message ${id} as published`);
  }

  async markAsFailed(id: string, error: string): Promise<void> {
    await this.prisma.outboxMessage.update({
      where: { id },
      data: {
        status: OutboxMessageStatus.FAILED,
        error,
        retryCount: {
          increment: 1,
        },
      },
    });

    this.logger.warn(`Marked message ${id} as failed: ${error}`);
  }

  async findByStatus(
    status: OutboxMessageStatus,
    limit = 100
  ): Promise<OutboxMessage[]> {
    const messages = await this.prisma.outboxMessage.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return messages.map((m: any) => this.toDomain(m));
  }

  async deletePublished(olderThan: Date): Promise<number> {
    const result = await this.prisma.outboxMessage.deleteMany({
      where: {
        status: OutboxMessageStatus.PUBLISHED,
        publishedAt: {
          lt: olderThan,
        },
      },
    });

    this.logger.log(`Deleted ${result.count} old published messages`);
    return result.count;
  }

  async findRetryableMessages(batchSize: number): Promise<OutboxMessage[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM outbox_messages
      WHERE status = ${OutboxMessageStatus.FAILED}
        AND retry_count < max_retries
        AND processed_at < NOW() - INTERVAL '1 minute' * POWER(2, retry_count)
      ORDER BY created_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return messages.map((m: any) =>
      this.toDomain(m as OutboxMessageRecord)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(prismaMessage: OutboxMessageRecord | any): OutboxMessage {
    // Handle both raw SQL (snake_case) and Prisma model (camelCase) results
    return {
      id: prismaMessage.id,
      aggregateId: prismaMessage.aggregateId || prismaMessage.aggregate_id,
      aggregateType: prismaMessage.aggregateType || prismaMessage.aggregate_type,
      eventType: prismaMessage.eventType || prismaMessage.event_type,
      payload: (prismaMessage.payload as Record<string, unknown>) || {},
      status: (prismaMessage.status as OutboxMessageStatus) || OutboxMessageStatus.PENDING,
      retryCount: prismaMessage.retryCount ?? prismaMessage.retry_count ?? 0,
      maxRetries: prismaMessage.maxRetries ?? prismaMessage.max_retries ?? 5,
      createdAt: prismaMessage.createdAt || prismaMessage.created_at,
      processedAt: prismaMessage.processedAt || prismaMessage.processed_at || undefined,
      publishedAt: prismaMessage.publishedAt || prismaMessage.published_at || undefined,
      error: prismaMessage.error || undefined,
      companyId: prismaMessage.companyId || prismaMessage.company_id || undefined,
      metadata:
        (prismaMessage.metadata as Record<string, unknown>) || undefined,
    };
  }
}
