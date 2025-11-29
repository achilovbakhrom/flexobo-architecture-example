/**
 * Payment Event Consumer (Projection)
 *
 * Subscribes to payment events from RabbitMQ and updates the read model.
 * This is a projection in the CQRS pattern - it listens to events published
 * by the outbox worker and updates the denormalized read model for queries.
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
  CommandBus,
} from '@flexobo/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IPaymentReadModelRepository,
  PAYMENT_READ_MODEL_REPOSITORY,
} from '../../ports/payment.repository.port';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
  PAYMENT_EVENTS,
} from '../../domain/events/event.constants';
import {
  MarkOrderPaidCommand,
  RecordPaymentFailedCommand,
} from '../../application/commands/order.commands';

// Test event type for simulating consumer failures (goes to DLQ after max retries)
const TEST_POISON_EVENT = 'PaymentPoisonTest';

interface PaymentEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PaymentEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentEventConsumer.name);
  private isSubscribed = false;

  constructor(
    @Inject(PAYMENT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IPaymentReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer,
    private readonly eventEmitter: EventEmitter2,
    private readonly commandBus: CommandBus
  ) {}

  async onModuleInit() {
    await this.subscribeToPaymentEvents();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.PAYMENT.PROJECTIONS);
    }
  }

  private async subscribeToPaymentEvents(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error(
        'RabbitMQ is not connected. Cannot start payment event consumer.'
      );
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.PAYMENT.PROJECTIONS,
      [ROUTING_KEYS.PAYMENT.ALL],
      async (message: IncomingMessage) => {
        await this.handlePaymentEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(
      `Payment projection subscribed to queue: ${QUEUES.PAYMENT.PROJECTIONS}`
    );
  }

  private async handlePaymentEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as PaymentEventPayload;

    this.logger.debug(
      `Received payment event: ${payload.type} for aggregate ${payload.aggregateId}`
    );

    // Framework auto-acks on success, auto-nacks on error
    switch (payload.type) {
      case EVENT_TYPES.PAYMENT.CREATED:
        await this.handlePaymentCreated(payload);
        break;

      case EVENT_TYPES.PAYMENT.PROCESSING:
        await this.handlePaymentProcessing(payload);
        break;

      case EVENT_TYPES.PAYMENT.COMPLETED:
        await this.handlePaymentCompleted(payload);
        break;

      case EVENT_TYPES.PAYMENT.FAILED:
        await this.handlePaymentFailed(payload);
        break;

      case EVENT_TYPES.PAYMENT.REFUNDED:
        await this.handlePaymentRefunded(payload);
        break;

      case TEST_POISON_EVENT:
        // This is a test event that always fails to demonstrate DLQ flow
        await this.handlePoisonEvent(payload);
        break;

      default:
        this.logger.warn(`Unknown payment event type: ${payload.type}`);
    }
  }

  private async handlePaymentCreated(
    event: PaymentEventPayload
  ): Promise<void> {
    this.logger.debug(`Processing PaymentCreated: ${event.aggregateId}`);

    await this.readModelRepository.upsert({
      id: event.aggregateId,
      orderId: event.data['orderId'] as string,
      amount: event.data['amount'] as number,
      currency: event.data['currency'] as string,
      status: 'PENDING',
      paymentMethod: event.data['paymentMethod'] as string,
      transactionId: null,
      failureReason: null,
      refundedAmount: null,
      processedAt: null,
      updatedAt: new Date(),
    });
  }

  private async handlePaymentProcessing(
    event: PaymentEventPayload
  ): Promise<void> {
    this.logger.debug(`Processing PaymentProcessing: ${event.aggregateId}`);

    const payment = await this.readModelRepository.findById(event.aggregateId);
    if (payment) {
      await this.readModelRepository.upsert({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: 'PROCESSING',
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        failureReason: payment.failureReason,
        refundedAmount: payment.refundedAmount,
        processedAt: payment.processedAt,
        updatedAt: new Date(),
      });
    }
  }

  private async handlePaymentCompleted(
    event: PaymentEventPayload
  ): Promise<void> {
    this.logger.debug(`Processing PaymentCompleted: ${event.aggregateId}`);

    const payment = await this.readModelRepository.findById(event.aggregateId);
    if (payment) {
      await this.readModelRepository.upsert({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: 'COMPLETED',
        paymentMethod: payment.paymentMethod,
        transactionId: event.data['transactionId'] as string,
        failureReason: null,
        refundedAmount: null,
        processedAt: new Date(event.data['processedAt'] as string),
        updatedAt: new Date(),
      });

      // Mark the order as paid via command (replaces saga)
      try {
        const command = new MarkOrderPaidCommand(
          payment.orderId,
          event.aggregateId,
          (event.data['transactionId'] as string) || 'unknown'
        );
        const result = await this.commandBus.execute(command);
        if (result.isSuccess) {
          this.logger.log(`Order ${payment.orderId} marked as PAID`);
        } else {
          this.logger.error(
            `Failed to mark order ${payment.orderId} as paid: ${result.error?.message}`
          );
        }
      } catch (error) {
        this.logger.error(
          `Error marking order ${payment.orderId} as paid`,
          error
        );
      }

      // Emit local event for any listeners
      this.eventEmitter.emit(PAYMENT_EVENTS.COMPLETED, {
        aggregateId: event.aggregateId,
        eventType: event.type,
        data: {
          ...event.data,
          orderId: payment.orderId,
        },
        version: event.version,
      });
    }
  }

  private async handlePaymentFailed(
    event: PaymentEventPayload
  ): Promise<void> {
    this.logger.debug(`Processing PaymentFailed: ${event.aggregateId}`);

    const payment = await this.readModelRepository.findById(event.aggregateId);
    if (payment) {
      await this.readModelRepository.upsert({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: 'FAILED',
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        failureReason: event.data['reason'] as string,
        refundedAmount: null,
        processedAt: new Date(event.data['processedAt'] as string),
        updatedAt: new Date(),
      });

      // Record payment failure on the order aggregate (replaces saga)
      // This handles auto-cancellation after max failures
      try {
        const command = new RecordPaymentFailedCommand(
          payment.orderId,
          event.aggregateId,
          (event.data['reason'] as string) || 'Payment failed'
        );
        const result = await this.commandBus.execute(command);
        if (result.isSuccess) {
          this.logger.log(
            `Recorded payment failure for order ${payment.orderId}`
          );
        } else {
          this.logger.error(
            `Failed to record payment failure for order ${payment.orderId}: ${result.error?.message}`
          );
        }
      } catch (error) {
        this.logger.error(
          `Error recording payment failure for order ${payment.orderId}`,
          error
        );
      }

      // Emit local event for any listeners
      this.eventEmitter.emit(PAYMENT_EVENTS.FAILED, {
        aggregateId: event.aggregateId,
        eventType: event.type,
        data: {
          ...event.data,
          orderId: payment.orderId,
        },
        version: event.version,
      });
    }
  }

  /**
   * Poison event handler - always throws an error to test DLQ flow
   * After 3 retries, the message will be sent to dead-letter queue
   */
  private async handlePoisonEvent(event: PaymentEventPayload): Promise<void> {
    const retryInfo = event.metadata?.['x-retry-count'] || 0;
    this.logger.warn(
      `[POISON TEST] Processing poison event: ${event.aggregateId} (retry: ${retryInfo})`
    );

    // Always throw an error - this will trigger retry mechanism
    throw new Error(
      `[POISON TEST] Simulated consumer failure for event ${event.aggregateId}. This message will go to DLQ after max retries.`
    );
  }

  private async handlePaymentRefunded(
    event: PaymentEventPayload
  ): Promise<void> {
    this.logger.debug(`Processing PaymentRefunded: ${event.aggregateId}`);

    const payment = await this.readModelRepository.findById(event.aggregateId);
    if (payment) {
      await this.readModelRepository.upsert({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: 'REFUNDED',
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        failureReason: null,
        refundedAmount: event.data['amount'] as number,
        processedAt: payment.processedAt,
        updatedAt: new Date(),
      });

      // Emit local event for saga to handle
      this.eventEmitter.emit(PAYMENT_EVENTS.REFUNDED, {
        aggregateId: event.aggregateId,
        eventType: event.type,
        data: {
          ...event.data,
          orderId: payment.orderId,
        },
        version: event.version,
      });

      this.logger.debug(
        `Emitted local PAYMENT_EVENTS.REFUNDED for saga (orderId: ${payment.orderId})`
      );
    }
  }
}
