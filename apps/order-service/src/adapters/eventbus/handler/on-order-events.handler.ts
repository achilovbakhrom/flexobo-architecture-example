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
  QUEUES,
  ROUTING_KEYS,
  EVENT_TYPES,
} from '../../../domain/events/event.constants';
import { RefundPaymentCommand } from '../../../application/commands/payment.commands';

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
      await this.rabbitMQConsumer.unsubscribe(QUEUES.ORDER.HANDLER);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error('RabbitMQ not connected');
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.ORDER.HANDLER,
      [ROUTING_KEYS.ORDER.CANCELLED],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      { durable: true, maxRetries: 3 }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.ORDER.HANDLER}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as OrderEventPayload;

    switch (payload.type) {
      case EVENT_TYPES.ORDER.CANCELLED:
        await this.onOrderCancelled(payload);
        break;
    }
  }

  private async onOrderCancelled(event: OrderEventPayload): Promise<void> {
    const paymentId = event.data['paymentId'] as string | undefined;
    const reason = (event.data['reason'] as string) || 'Order cancelled';

    if (!paymentId) {
      this.logger.debug(`Order ${event.aggregateId} cancelled without payment`);
      return;
    }

    this.logger.log(`Order ${event.aggregateId} cancelled, initiating refund`);

    const command = new RefundPaymentCommand(paymentId, 0, reason);
    const result = await this.commandBus.execute(command);

    if (result.isSuccess) {
      this.logger.log(`Payment ${paymentId} refund initiated`);
    } else {
      this.logger.error(`Failed to refund payment: ${result.error?.message}`);
    }
  }
}
