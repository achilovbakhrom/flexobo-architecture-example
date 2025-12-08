import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IMessagePublisher,
  MESSAGE_PUBLISHER,
  NotificationTarget,
  NotificationChannel,
  NotificationType,
  NotificationCategory,
  NotificationSeverity,
} from '@flexobo/core';
import {
  PaymentInitiatedEventData,
  PaymentSucceededEventData,
  PaymentFailedEventData,
  PaymentRefundedEventData,
} from '../../../domain/events/payment.events';

interface ProjectedEvent<T> {
  aggregateId: string;
  data: T;
  version: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PaymentNotificationHandler {
  private readonly logger = new Logger(PaymentNotificationHandler.name);

  constructor(
    @Optional()
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: IMessagePublisher | null,
  ) {}

  @OnEvent('payment.initiated')
  async handlePaymentInitiated(
    event: ProjectedEvent<PaymentInitiatedEventData>,
  ): Promise<void> {
    // No notification for initiated payments - wait for result
    this.logger.debug(`Payment initiated: ${event.data.paymentId}`);
  }

  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(
    event: ProjectedEvent<PaymentSucceededEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) {
      this.logger.warn('Message publisher not available, skipping notification');
      return;
    }

    // PaymentSucceededEventData only has paymentId, externalId, and paymentMethod
    // Use aggregateId which should be the payment ID
    await this.sendNotification({
      target: NotificationTarget.User,
      userIds: [event.aggregateId], // Use aggregateId as fallback
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Payment,
        severity: NotificationSeverity.Success,
        title: 'Payment Successful',
        body: 'Your payment has been processed successfully',
        data: {
          paymentId: event.data.paymentId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    });
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(
    event: ProjectedEvent<PaymentFailedEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) return;

    await this.sendNotification({
      target: NotificationTarget.User,
      userIds: [event.aggregateId], // Use aggregateId as fallback
      channels: [NotificationChannel.Sse, NotificationChannel.Email, NotificationChannel.Push],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Payment,
        severity: NotificationSeverity.Error,
        title: 'Payment Failed',
        body: event.data.failureReason || 'Your payment could not be processed. Please update your payment method.',
        data: {
          paymentId: event.data.paymentId,
          failureReason: event.data.failureReason,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    });
  }

  @OnEvent('payment.refunded')
  async handlePaymentRefunded(
    event: ProjectedEvent<PaymentRefundedEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) return;

    await this.sendNotification({
      target: NotificationTarget.User,
      userIds: [event.aggregateId], // Use aggregateId as fallback
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Payment,
        severity: NotificationSeverity.Info,
        title: 'Payment Refunded',
        body: `Your payment has been refunded (${event.data.refundAmount})`,
        data: {
          paymentId: event.data.paymentId,
          refundAmount: event.data.refundAmount,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    });
  }

  private async sendNotification(notification: {
    target: NotificationTarget;
    userIds: string[];
    channels: NotificationChannel[];
    payload: {
      type: NotificationType;
      category: NotificationCategory;
      severity: NotificationSeverity;
      title: string;
      body: string;
      data: Record<string, unknown>;
    };
    correlationId?: string;
  }): Promise<void> {
    const routingKey =
      notification.target === NotificationTarget.Broadcast
        ? 'notification.broadcast'
        : `notification.user.${notification.userIds.join(',')}`;

    try {
      await this.messagePublisher!.publish(
        'flexobo.events',
        {
          target: notification.target,
          userIds: notification.userIds,
          channels: notification.channels,
          ...notification.payload,
        },
        {
          routingKey,
          correlationId: notification.correlationId,
        },
      );
      this.logger.debug(`Sent notification: ${notification.payload.title}`);
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error}`);
    }
  }
}
