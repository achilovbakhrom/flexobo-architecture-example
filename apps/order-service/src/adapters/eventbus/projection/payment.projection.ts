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
  IPaymentReadModelRepository,
  PAYMENT_READ_MODEL_REPOSITORY,
} from '../../../ports/payment.repository.port';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../../domain/events/event.constants';

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
export class PaymentProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(PAYMENT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IPaymentReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.PAYMENT.PROJECTION);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error(
        'RabbitMQ is not connected. Cannot start payment projection.'
      );
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.PAYMENT.PROJECTION,
      [ROUTING_KEYS.PAYMENT.ALL],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Payment projection subscribed to queue: ${QUEUES.PAYMENT.PROJECTION}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as PaymentEventPayload;

    this.logger.debug(
      `[Projection] Payment event: ${payload.type} for ${payload.aggregateId}`
    );

    switch (payload.type) {
      case EVENT_TYPES.PAYMENT.CREATED:
        await this.onPaymentCreated(payload);
        break;

      case EVENT_TYPES.PAYMENT.PROCESSING:
        await this.onPaymentProcessing(payload);
        break;

      case EVENT_TYPES.PAYMENT.COMPLETED:
        await this.onPaymentCompleted(payload);
        break;

      case EVENT_TYPES.PAYMENT.FAILED:
        await this.onPaymentFailed(payload);
        break;

      case EVENT_TYPES.PAYMENT.REFUNDED:
        await this.onPaymentRefunded(payload);
        break;

      case TEST_POISON_EVENT:
        await this.onPoisonEvent(payload);
        break;

      default:
        this.logger.warn(`Unknown payment event type: ${payload.type}`);
    }
  }

  private async onPaymentCreated(event: PaymentEventPayload): Promise<void> {
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

  private async onPaymentProcessing(event: PaymentEventPayload): Promise<void> {
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

  private async onPaymentCompleted(event: PaymentEventPayload): Promise<void> {
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
    }
  }

  private async onPaymentFailed(event: PaymentEventPayload): Promise<void> {
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
    }
  }

  private async onPaymentRefunded(event: PaymentEventPayload): Promise<void> {
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
    }
  }

  /**
   * Poison event handler - always throws an error to test DLQ flow
   */
  private async onPoisonEvent(event: PaymentEventPayload): Promise<void> {
    const retryInfo = event.metadata?.['x-retry-count'] || 0;
    this.logger.warn(
      `[POISON TEST] Processing poison event: ${event.aggregateId} (retry: ${retryInfo})`
    );

    throw new Error(
      `[POISON TEST] Simulated consumer failure for event ${event.aggregateId}. This message will go to DLQ after max retries.`
    );
  }
}
