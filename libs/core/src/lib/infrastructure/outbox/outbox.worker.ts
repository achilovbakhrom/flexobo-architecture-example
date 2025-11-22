import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { IMessagePublisher } from '../messaging/message-publisher.interface';
import { OutboxMessage } from './outbox-message.interface';

/**
 * Configuration for the outbox worker
 */
export interface OutboxWorkerConfig {
  /**
   * Polling interval in milliseconds
   * Default: 1000 (1 second)
   */
  pollingIntervalMs?: number;

  /**
   * Number of messages to process per batch
   * Default: 100
   */
  batchSize?: number;

  /**
   * Number of concurrent message publishing operations
   * Default: 10
   */
  concurrency?: number;

  /**
   * Whether to enable the worker
   * Default: true
   */
  enabled?: boolean;

  /**
   * Cleanup interval for old published messages (milliseconds)
   * Default: 3600000 (1 hour)
   */
  cleanupIntervalMs?: number;

  /**
   * Days to keep published messages before cleanup
   * Default: 7
   */
  retentionDays?: number;
}

/**
 * Background worker that polls the outbox table and publishes messages
 * to the message broker. Implements:
 * - Polling with configurable interval
 * - Batch processing
 * - Concurrent publishing with limit
 * - Exponential backoff for retries
 * - Automatic cleanup of old messages
 * - Graceful shutdown
 */
@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private pollingTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private isRunning = false;
  private isShuttingDown = false;

  private readonly pollingIntervalMs: number;
  private readonly batchSize: number;
  private readonly concurrency: number;
  private readonly enabled: boolean;
  private readonly cleanupIntervalMs: number;
  private readonly retentionDays: number;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly messagePublisher: IMessagePublisher,
    config?: OutboxWorkerConfig
  ) {
    this.pollingIntervalMs = config?.pollingIntervalMs || 1000;
    this.batchSize = config?.batchSize || 100;
    this.concurrency = config?.concurrency || 10;
    this.enabled = config?.enabled !== false;
    this.cleanupIntervalMs = config?.cleanupIntervalMs || 3600000; // 1 hour
    this.retentionDays = config?.retentionDays || 7;
  }

  async onModuleInit() {
    if (this.enabled) {
      this.logger.log('Starting outbox worker...');
      this.start();
      this.startCleanupScheduler();
    } else {
      this.logger.log('Outbox worker is disabled');
    }
  }

  async onModuleDestroy() {
    await this.stop();
  }

  /**
   * Start the polling loop
   */
  private start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.poll();
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    this.logger.log('Stopping outbox worker...');
    this.isShuttingDown = true;

    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Wait for current batch to finish
    while (this.isRunning) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.logger.log('Outbox worker stopped');
  }

  /**
   * Poll for pending messages and process them
   */
  private async poll(): Promise<void> {
    if (this.isShuttingDown) {
      this.isRunning = false;
      return;
    }

    try {
      // Process pending messages
      await this.processPendingMessages();

      // Process retryable failed messages
      await this.processRetryableMessages();
    } catch (error) {
      this.logger.error('Error in outbox polling cycle', error);
    }

    // Schedule next poll
    this.pollingTimer = setTimeout(() => this.poll(), this.pollingIntervalMs);
  }

  /**
   * Process pending messages
   */
  private async processPendingMessages(): Promise<void> {
    const messages = await this.outboxService.getPendingMessages(
      this.batchSize
    );

    if (messages.length === 0) {
      return;
    }

    this.logger.debug(`Processing ${messages.length} pending messages`);

    await this.processMessages(messages);
  }

  /**
   * Process retryable failed messages
   */
  private async processRetryableMessages(): Promise<void> {
    const messages = await this.outboxService.getRetryableMessages(
      Math.floor(this.batchSize / 2)
    );

    if (messages.length === 0) {
      return;
    }

    this.logger.debug(`Retrying ${messages.length} failed messages`);

    await this.processMessages(messages);
  }

  /**
   * Process a batch of messages with concurrency control
   */
  private async processMessages(messages: OutboxMessage[]): Promise<void> {
    const chunks = this.chunkArray(messages, this.concurrency);

    for (const chunk of chunks) {
      if (this.isShuttingDown) {
        break;
      }

      await Promise.all(chunk.map((message) => this.processMessage(message)));
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(message: OutboxMessage): Promise<void> {
    try {
      // Mark as processing
      await this.outboxService.markAsProcessing(message.id);

      // Publish to message broker
      await this.messagePublisher.publish(
        message.eventType,
        message.payload,
        message.metadata
      );

      // Mark as published
      await this.outboxService.markAsPublished(message.id);

      this.logger.debug(
        `Published message ${message.id} (${message.eventType})`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to publish message ${message.id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );

      // Mark as failed
      await this.outboxService.markAsFailed(message.id, errorMessage);
    }
  }

  /**
   * Start the cleanup scheduler
   */
  private startCleanupScheduler(): void {
    this.logger.log(
      `Starting cleanup scheduler (interval: ${this.cleanupIntervalMs}ms, retention: ${this.retentionDays} days)`
    );

    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      this.cleanupIntervalMs
    );

    // Run cleanup immediately on startup
    setImmediate(() => this.cleanup());
  }

  /**
   * Clean up old published messages
   */
  private async cleanup(): Promise<void> {
    try {
      const count = await this.outboxService.cleanupPublishedMessages(
        this.retentionDays
      );

      if (count > 0) {
        this.logger.log(`Cleaned up ${count} old published messages`);
      }
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get worker status
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    shuttingDown: boolean;
    pollingIntervalMs: number;
    batchSize: number;
    concurrency: number;
  } {
    return {
      enabled: this.enabled,
      running: this.isRunning,
      shuttingDown: this.isShuttingDown,
      pollingIntervalMs: this.pollingIntervalMs,
      batchSize: this.batchSize,
      concurrency: this.concurrency,
    };
  }
}
