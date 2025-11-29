/**
 * Order Event Handler (Event → Command)
 *
 * Subscribes to order events and executes payment commands.
 * Following Go pattern: event handlers trigger commands on other aggregates.
 *
 * Responsibilities:
 * - OrderCancelled -> RefundPaymentCommand (if payment exists)
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
  ROUTING_KEYS,
  EVENT_TYPES,
} from '../../domain/events/event.constants';
import { RefundPaymentCommand } from '../../application/commands/payment.commands';

const QUEUE_NAME = 'order-service.order-workflow';

interface OrderEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class OnOrderEventsHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OnOrderEventsHandler.name);
  private isSubscribed = false;

  constructor(
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
        'RabbitMQ is not connected. Cannot start order workflow handler.'
      );
    }

    // Subscribe to order cancelled events
    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUE_NAME,
      [ROUTING_KEYS.ORDER.CANCELLED],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Order workflow handler subscribed to queue: ${QUEUE_NAME}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as OrderEventPayload;

    this.logger.debug(
      `[Workflow] Order event: ${payload.type} for ${payload.aggregateId}`
    );

    switch (payload.type) {
      case EVENT_TYPES.ORDER.CANCELLED:
        await this.onOrderCancelled(payload);
        break;
    }
  }

  /**
   * When order is cancelled, initiate refund if payment exists
   */
  private async onOrderCancelled(event: OrderEventPayload): Promise<void> {
    const paymentId = event.data['paymentId'] as string | undefined;
    const reason = (event.data['reason'] as string) || 'Order cancelled';

    if (!paymentId) {
      this.logger.debug(
        `Order ${event.aggregateId} cancelled without payment - no refund needed`
      );
      return;
    }

    this.logger.log(
      `Order ${event.aggregateId} cancelled with payment ${paymentId}, initiating refund`
    );

    try {
      const command = new RefundPaymentCommand(paymentId, 0, reason);
      const result = await this.commandBus.execute(command);

      if (result.isSuccess) {
        this.logger.log(`Payment ${paymentId} refund initiated`);
      } else {
        this.logger.error(
          `Failed to refund payment ${paymentId}: ${result.error?.message}`
        );
      }
    } catch (error) {
      this.logger.error(`Error refunding payment ${paymentId}`, error);
      throw error; // Re-throw to trigger retry
    }
  }
}
