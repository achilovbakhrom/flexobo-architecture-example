import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../../domain/domain-event.interface';
import {
  IOutboxRepository,
  OutboxMessage,
  OutboxMessageStatus,
} from './outbox-message.interface';

/**
 * Configuration for outbox service
 */
export interface OutboxServiceConfig {
  /**
   * Maximum number of retry attempts before marking as permanently failed
   * Default: 5
   */
  maxRetries?: number;

  /**
   * Default company ID for non-multi-tenant scenarios
   */
  defaultCompanyId?: string;
}

/**
 * Service for managing outbox messages
 * Provides high-level operations for saving and publishing domain events
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly maxRetries: number;
  private readonly defaultCompanyId?: string;

  constructor(
    private readonly repository: IOutboxRepository,
    config?: OutboxServiceConfig
  ) {
    this.maxRetries = config?.maxRetries || 5;
    this.defaultCompanyId = config?.defaultCompanyId;
  }

  /**
   * Save a domain event to the outbox for later publishing
   * This should be called within the same transaction as the domain changes
   */
  async saveEvent(
    event: DomainEvent,
    aggregateId: string,
    aggregateType: string,
    companyId?: string,
    metadata?: Record<string, unknown>
  ): Promise<OutboxMessage> {
    const message = await this.repository.save({
      aggregateId,
      aggregateType,
      eventType: event.type,
      payload: event as unknown as Record<string, unknown>,
      status: OutboxMessageStatus.PENDING,
      retryCount: 0,
      maxRetries: this.maxRetries,
      companyId: companyId || this.defaultCompanyId,
      metadata,
    });

    this.logger.debug(
      `Saved event ${event.type} for ${aggregateType}:${aggregateId} to outbox`
    );

    return message;
  }

  /**
   * Save multiple domain events to the outbox
   */
  async saveEvents(
    events: DomainEvent[],
    aggregateId: string,
    aggregateType: string,
    companyId?: string,
    metadata?: Record<string, unknown>
  ): Promise<OutboxMessage[]> {
    const messages: OutboxMessage[] = [];

    for (const event of events) {
      const message = await this.saveEvent(
        event,
        aggregateId,
        aggregateType,
        companyId,
        metadata
      );
      messages.push(message);
    }

    return messages;
  }

  /**
   * Get pending messages for processing
   */
  async getPendingMessages(batchSize = 100): Promise<OutboxMessage[]> {
    return this.repository.findPendingMessages(batchSize);
  }

  /**
   * Get retryable failed messages
   */
  async getRetryableMessages(batchSize = 50): Promise<OutboxMessage[]> {
    return this.repository.findRetryableMessages(batchSize);
  }

  /**
   * Mark message as processing
   */
  async markAsProcessing(messageId: string): Promise<void> {
    await this.repository.markAsProcessing(messageId);
  }

  /**
   * Mark message as published
   */
  async markAsPublished(messageId: string): Promise<void> {
    await this.repository.markAsPublished(messageId);
  }

  /**
   * Mark message as failed
   */
  async markAsFailed(messageId: string, error: string): Promise<void> {
    await this.repository.markAsFailed(messageId, error);
  }

  /**
   * Get messages by status for monitoring
   */
  async getMessagesByStatus(
    status: OutboxMessageStatus,
    limit?: number
  ): Promise<OutboxMessage[]> {
    return this.repository.findByStatus(status, limit);
  }

  /**
   * Clean up old published messages
   * Should be called periodically by a scheduled job
   */
  async cleanupPublishedMessages(olderThanDays = 7): Promise<number> {
    const olderThan = new Date();
    olderThan.setDate(olderThan.getDate() - olderThanDays);

    const count = await this.repository.deletePublished(olderThan);
    this.logger.log(
      `Cleaned up ${count} published messages older than ${olderThanDays} days`
    );

    return count;
  }

  /**
   * Get statistics about outbox messages
   */
  async getStatistics(): Promise<{
    pending: number;
    processing: number;
    published: number;
    failed: number;
  }> {
    const [pending, processing, published, failed] = await Promise.all([
      this.repository.findByStatus(OutboxMessageStatus.PENDING, 1),
      this.repository.findByStatus(OutboxMessageStatus.PROCESSING, 1),
      this.repository.findByStatus(OutboxMessageStatus.PUBLISHED, 1),
      this.repository.findByStatus(OutboxMessageStatus.FAILED, 1),
    ]);

    return {
      pending: pending.length,
      processing: processing.length,
      published: published.length,
      failed: failed.length,
    };
  }
}
