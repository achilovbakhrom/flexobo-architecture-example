/**
 * Payment Event Handler (Event → Command)
 *
 * Subscribes to payment events and executes order commands.
 * Following Go pattern: event handlers trigger commands on other aggregates.
 *
 * Responsibilities:
 * - PaymentCompleted -> MarkOrderPaidCommand
 * - PaymentFailed -> RecordPaymentFailedCommand
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
import {
  IPaymentReadModelRepository,
  PAYMENT_READ_MODEL_REPOSITORY,
} from '../../ports/payment.repository.port';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
} from '../../domain/events/event.constants';
import {
  MarkOrderPaidCommand,
  RecordPaymentFailedCommand,
} from '../../application/commands/order.commands';

const QUEUE_NAME = 'order-service.payment-workflow';

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
export class OnPaymentEventsHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OnPaymentEventsHandler.name);
  private isSubscribed = false;

  constructor(
    @Inject(PAYMENT_READ_MODEL_REPOSITORY)
    private readonly paymentReadModel: IPaymentReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer,
    private readonly commandBus: CommandBus
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUE_NAME);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error(
        'RabbitMQ is not connected. Cannot start payment workflow handler.'
      );
    }

    // Subscribe to payment completed and failed events
    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUE_NAME,
      [ROUTING_KEYS.PAYMENT.COMPLETED, ROUTING_KEYS.PAYMENT.FAILED],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Payment workflow handler subscribed to queue: ${QUEUE_NAME}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as PaymentEventPayload;

    this.logger.debug(
      `[Workflow] Payment event: ${payload.type} for ${payload.aggregateId}`
    );

    switch (payload.type) {
      case EVENT_TYPES.PAYMENT.COMPLETED:
        await this.onPaymentCompleted(payload);
        break;

      case EVENT_TYPES.PAYMENT.FAILED:
        await this.onPaymentFailed(payload);
        break;
    }
  }

  /**
   * When payment is completed, mark the order as paid
   */
  private async onPaymentCompleted(event: PaymentEventPayload): Promise<void> {
    const payment = await this.paymentReadModel.findById(event.aggregateId);
    if (!payment) {
      this.logger.warn(`Payment ${event.aggregateId} not found in read model`);
      return;
    }

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
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * When payment fails, record failure on order (triggers auto-cancel after max failures)
   */
  private async onPaymentFailed(event: PaymentEventPayload): Promise<void> {
    const payment = await this.paymentReadModel.findById(event.aggregateId);
    if (!payment) {
      this.logger.warn(`Payment ${event.aggregateId} not found in read model`);
      return;
    }

    try {
      const command = new RecordPaymentFailedCommand(
        payment.orderId,
        event.aggregateId,
        (event.data['reason'] as string) || 'Payment failed'
      );
      const result = await this.commandBus.execute(command);

      if (result.isSuccess) {
        this.logger.log(`Recorded payment failure for order ${payment.orderId}`);
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
      throw error; // Re-throw to trigger retry
    }
  }
}
