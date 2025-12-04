import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma.module';
import {
  PaymentInitiatedEventData,
  PaymentProcessingEventData,
  PaymentSucceededEventData,
  PaymentFailedEventData,
  PaymentRefundedEventData,
} from '../../../domain/events/payment.events';
import { PaymentStatus } from '../../../domain/constants/enums';

interface ProjectedEvent<T> {
  aggregateId: string;
  data: T;
  version: number;
  timestamp: Date;
}

@Injectable()
export class PaymentProjection implements OnModuleInit {
  private readonly logger = new Logger(PaymentProjection.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('PaymentProjection initialized');
  }

  @OnEvent('payment.initiated')
  async handlePaymentInitiated(
    event: ProjectedEvent<PaymentInitiatedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting PaymentInitiatedEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    await this.prisma.paymentReadModel.create({
      data: {
        id: data.paymentId,
        subscriptionId: data.subscriptionId,
        companyId: data.companyId,
        amount: data.amount,
        currency: data.currency,
        status: PaymentStatus.PENDING,
        provider: data.provider,
        paymentType: data.paymentType,
        retryCount: 0,
        version: event.version,
      },
    });
  }

  @OnEvent('payment.processing')
  async handlePaymentProcessing(
    event: ProjectedEvent<PaymentProcessingEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting PaymentProcessingEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    await this.prisma.paymentReadModel.update({
      where: { id: data.paymentId },
      data: {
        status: PaymentStatus.PROCESSING,
        externalId: data.externalId,
        version: event.version,
      },
    });
  }

  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(
    event: ProjectedEvent<PaymentSucceededEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting PaymentSucceededEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    await this.prisma.paymentReadModel.update({
      where: { id: data.paymentId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        externalId: data.externalId,
        paymentMethod: data.paymentMethod
          ? { type: data.paymentMethod.type, last4: data.paymentMethod.last4, brand: data.paymentMethod.brand }
          : undefined,
        version: event.version,
      },
    });
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(
    event: ProjectedEvent<PaymentFailedEventData>,
  ): Promise<void> {
    this.logger.debug(`Projecting PaymentFailedEvent for ${event.aggregateId}`);

    const data = event.data;

    await this.prisma.paymentReadModel.update({
      where: { id: data.paymentId },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: data.failureReason,
        retryCount: data.retryCount,
        version: event.version,
      },
    });
  }

  @OnEvent('payment.refunded')
  async handlePaymentRefunded(
    event: ProjectedEvent<PaymentRefundedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting PaymentRefundedEvent for ${event.aggregateId}`,
    );

    await this.prisma.paymentReadModel.update({
      where: { id: event.data.paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        version: event.version,
      },
    });
  }
}
