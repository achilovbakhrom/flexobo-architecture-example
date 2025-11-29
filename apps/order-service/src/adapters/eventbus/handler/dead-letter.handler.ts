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
} from '../../../ports/dead-letter.repository.port';
import { QUEUES, EXCHANGES } from '../../../domain/events/event.constants';

@Injectable()
export class DeadLetterHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeadLetterHandler.name);
  private isSubscribed = false;

  constructor(
    @Inject(DEAD_LETTER_REPOSITORY)
    private readonly deadLetterRepository: IDeadLetterRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.DEAD_LETTER);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error('RabbitMQ not connected');
    }

    await this.rabbitMQConsumer.subscribe(
      QUEUES.DEAD_LETTER,
      async (message: IncomingMessage) => {
        await this.handleDeadLetter(message);
      },
      { durable: true, noAck: false }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.DEAD_LETTER}`);
  }

  private async handleDeadLetter(message: IncomingMessage): Promise<void> {
    const payload = message.content as Record<string, unknown>;
    const metadata = message.metadata;

    this.logger.warn(`Dead letter received: ${metadata?.routingKey}`);

    try {
      const headers = metadata?.headers || {};

      await this.deadLetterRepository.create({
        routingKey: metadata?.routingKey || 'unknown',
        exchange: EXCHANGES.DEAD_LETTER,
        payload,
        error: headers['x-last-error'] as string | undefined,
        retryCount: (headers['x-retry-count'] as number) || 0,
        originalTimestamp: metadata?.timestamp ? new Date(metadata.timestamp) : undefined,
        metadata: {
          messageId: metadata?.messageId,
          correlationId: metadata?.correlationId,
          originalQueue: headers['x-original-queue'],
          headers,
        },
      });

      this.logger.log(`Dead letter stored: ${metadata?.routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to store dead letter: ${error}`);
    }
  }
}
