/**
 * Payment Event Consumer
 *
 * Consumes payment events from the message queue and updates the read model.
 * In production, this would use RabbitMQ, Kafka, or similar message broker.
 * Currently uses NestJS EventEmitter for local development.
 */

import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IPaymentReadModelRepository,
  PAYMENT_READ_MODEL_REPOSITORY,
} from '../../ports/payment.repository.port';
import { PAYMENT_EVENTS } from '../../domain/events/event.constants';

interface PaymentEventData {
  aggregateId: string;
  eventType: string;
  data: Record<string, unknown>;
  version: number;
}

@Injectable()
export class PaymentEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(PaymentEventConsumer.name);

  constructor(
    @Inject(PAYMENT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IPaymentReadModelRepository
  ) {}

  onModuleInit() {
    this.logger.log('Payment event consumer initialized');
  }

  @OnEvent(PAYMENT_EVENTS.CREATED)
  async handlePaymentCreated(event: PaymentEventData): Promise<void> {
    this.logger.debug(`Consuming PaymentCreated: ${event.aggregateId}`);

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

  @OnEvent(PAYMENT_EVENTS.PROCESSING)
  async handlePaymentProcessing(event: PaymentEventData): Promise<void> {
    this.logger.debug(`Consuming PaymentProcessing: ${event.aggregateId}`);

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

  @OnEvent(PAYMENT_EVENTS.COMPLETED)
  async handlePaymentCompleted(event: PaymentEventData): Promise<void> {
    this.logger.debug(`Consuming PaymentCompleted: ${event.aggregateId}`);

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

  @OnEvent(PAYMENT_EVENTS.FAILED)
  async handlePaymentFailed(event: PaymentEventData): Promise<void> {
    this.logger.debug(`Consuming PaymentFailed: ${event.aggregateId}`);

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

  @OnEvent(PAYMENT_EVENTS.REFUNDED)
  async handlePaymentRefunded(event: PaymentEventData): Promise<void> {
    this.logger.debug(`Consuming PaymentRefunded: ${event.aggregateId}`);

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
}
