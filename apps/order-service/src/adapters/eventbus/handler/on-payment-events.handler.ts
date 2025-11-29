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
} from '../../../ports/payment.repository.port';
import {
  QUEUES,
  ROUTING_KEYS,
  EVENT_TYPES,
} from '../../../domain/events/event.constants';
import {
  MarkOrderPaidCommand,
  RecordPaymentFailedCommand,
} from '../../../application/commands/order.commands';

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
      await this.rabbitMQConsumer.unsubscribe(QUEUES.PAYMENT.HANDLER);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error('RabbitMQ not connected');
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.PAYMENT.HANDLER,
      [ROUTING_KEYS.PAYMENT.COMPLETED, ROUTING_KEYS.PAYMENT.FAILED],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      { durable: true, maxRetries: 3 }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.PAYMENT.HANDLER}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as PaymentEventPayload;

    switch (payload.type) {
      case EVENT_TYPES.PAYMENT.COMPLETED:
        await this.onPaymentCompleted(payload);
        break;
      case EVENT_TYPES.PAYMENT.FAILED:
        await this.onPaymentFailed(payload);
        break;
    }
  }

  private async onPaymentCompleted(event: PaymentEventPayload): Promise<void> {
    const payment = await this.paymentReadModel.findById(event.aggregateId);
    if (!payment) {
      this.logger.warn(`Payment ${event.aggregateId} not found`);
      return;
    }

    const command = new MarkOrderPaidCommand(
      payment.orderId,
      event.aggregateId,
      (event.data['transactionId'] as string) || 'unknown'
    );
    const result = await this.commandBus.execute(command);

    if (result.isSuccess) {
      this.logger.log(`Order ${payment.orderId} marked as PAID`);
    } else {
      this.logger.error(`Failed to mark order as paid: ${result.error?.message}`);
    }
  }

  private async onPaymentFailed(event: PaymentEventPayload): Promise<void> {
    const payment = await this.paymentReadModel.findById(event.aggregateId);
    if (!payment) {
      this.logger.warn(`Payment ${event.aggregateId} not found`);
      return;
    }

    const command = new RecordPaymentFailedCommand(
      payment.orderId,
      event.aggregateId,
      (event.data['reason'] as string) || 'Payment failed'
    );
    const result = await this.commandBus.execute(command);

    if (result.isSuccess) {
      this.logger.log(`Recorded payment failure for order ${payment.orderId}`);
    } else {
      this.logger.error(`Failed to record payment failure: ${result.error?.message}`);
    }
  }
}
