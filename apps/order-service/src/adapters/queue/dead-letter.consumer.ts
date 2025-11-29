/**
 * Dead Letter Consumer
 *
 * Subscribes to the dead letter queue to capture messages that failed processing.
 * This consumer logs and stores unprocessable messages for later analysis
 * and potential manual reprocessing.
 */

import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
} from '@flexobo/core';
import {
  IDeadLetterRepository,
  DEAD_LETTER_REPOSITORY,
} from '../../ports/dead-letter.repository.port';
import { QUEUES, EXCHANGES } from '../../domain/events/event.constants';

interface DeadLetterPayload {
  [key: string]: unknown;
}

@Injectable()
export class DeadLetterConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeadLetterConsumer.name);
  private isSubscribed = false;

  constructor(
    @Inject(DEAD_LETTER_REPOSITORY)
    private readonly deadLetterRepository: IDeadLetterRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribeToDeadLetterQueue();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.DEAD_LETTER);
    }
  }

  /**
   * Subscribe to dead letter queue
   * Fails fast if RabbitMQ is not connected
   */
  private async subscribeToDeadLetterQueue(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error(
        'RabbitMQ is not connected. Cannot start dead letter consumer.'
      );
    }

    // Subscribe directly to the dead letter queue
    // The queue is already created and bound by RabbitMQ infrastructure setup
    await this.rabbitMQConsumer.subscribe(
      QUEUES.DEAD_LETTER,
      async (message: IncomingMessage) => {
        await this.handleDeadLetter(message);
      },
      {
        durable: true,
        noAck: false,
      }
    );

    this.isSubscribed = true;
    this.logger.log(
      `Dead letter consumer subscribed to queue: ${QUEUES.DEAD_LETTER}`
    );
  }

  /**
   * Handle dead letter messages
   * Store them in the database for later analysis
   */
  private async handleDeadLetter(message: IncomingMessage): Promise<void> {
    const payload = message.content as DeadLetterPayload;
    const metadata = message.metadata;

    this.logger.warn(
      `Received dead letter message with routing key: ${metadata?.routingKey}`
    );

    try {
      // Extract retry count and original timestamp from headers
      const headers = metadata?.headers || {};
      const retryCount = (headers['x-retry-count'] as number) || 0;
      const originalQueue = headers['x-original-queue'] as string | undefined;

      await this.deadLetterRepository.create({
        routingKey: metadata?.routingKey || 'unknown',
        exchange: EXCHANGES.DEAD_LETTER,
        payload: payload as Record<string, unknown>,
        error: headers['x-last-error'] as string | undefined,
        retryCount,
        originalTimestamp: metadata?.timestamp
          ? new Date(metadata.timestamp)
          : undefined,
        metadata: {
          messageId: metadata?.messageId,
          correlationId: metadata?.correlationId,
          originalQueue,
          headers,
        },
      });

      this.logger.log(
        `Dead letter message stored: routing_key=${metadata?.routingKey}, retry_count=${retryCount}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to store dead letter message: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      // Don't throw - we don't want to create infinite retry loops for dead letters
      // Just log the error and acknowledge the message
    }
  }
}
