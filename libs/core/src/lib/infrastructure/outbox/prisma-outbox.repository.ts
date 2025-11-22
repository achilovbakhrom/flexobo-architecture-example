import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  IOutboxRepository,
  OutboxMessage,
  OutboxMessageStatus,
} from './outbox-message.interface';

// Infer the OutboxMessage type from Prisma's return type
type PrismaOutboxMessage = Awaited<
  ReturnType<PrismaClient['outboxMessage']['findUnique']>
>;

/**
 * Prisma-based implementation of the outbox repository
 * with support for distributed locking (FOR UPDATE SKIP LOCKED)
 */
@Injectable()
export class PrismaOutboxRepository implements IOutboxRepository {
  private readonly logger = new Logger(PrismaOutboxRepository.name);

  constructor(private readonly prisma: PrismaClient) {}

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
    // Use raw SQL for FOR UPDATE SKIP LOCKED
    // This ensures only one worker processes each message
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
      this.toDomain(m as NonNullable<PrismaOutboxMessage>)
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
    // Find failed messages that haven't exceeded max retries
    // Use exponential backoff: wait 2^retryCount minutes before retry
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
      this.toDomain(m as NonNullable<PrismaOutboxMessage>)
    );
  }

  /**
   * Convert Prisma entity to domain model
   */
  private toDomain(
    prismaMessage: NonNullable<PrismaOutboxMessage>
  ): OutboxMessage {
    return {
      id: prismaMessage.id,
      aggregateId: prismaMessage.aggregateId,
      aggregateType: prismaMessage.aggregateType,
      eventType: prismaMessage.eventType,
      payload: prismaMessage.payload as Record<string, unknown>,
      status: prismaMessage.status as OutboxMessageStatus,
      retryCount: prismaMessage.retryCount,
      maxRetries: prismaMessage.maxRetries,
      createdAt: prismaMessage.createdAt,
      processedAt: prismaMessage.processedAt || undefined,
      publishedAt: prismaMessage.publishedAt || undefined,
      error: prismaMessage.error || undefined,
      companyId: prismaMessage.companyId || undefined,
      metadata:
        (prismaMessage.metadata as Record<string, unknown>) || undefined,
    };
  }
}
