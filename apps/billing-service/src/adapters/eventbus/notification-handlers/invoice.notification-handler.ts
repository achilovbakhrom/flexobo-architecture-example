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
  InvoiceCreatedEventData,
  InvoicePaidEventData,
  InvoiceVoidedEventData,
} from '../../../domain/events/invoice.events';

interface ProjectedEvent<T> {
  aggregateId: string;
  data: T;
  version: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class InvoiceNotificationHandler {
  private readonly logger = new Logger(InvoiceNotificationHandler.name);

  constructor(
    @Optional()
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: IMessagePublisher | null,
  ) {}

  @OnEvent('invoice.created')
  async handleInvoiceCreated(
    event: ProjectedEvent<InvoiceCreatedEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) {
      this.logger.warn('Message publisher not available, skipping notification');
      return;
    }

    const notification = {
      target: NotificationTarget.User,
      userIds: [event.data.companyId],
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Payment,
        severity: NotificationSeverity.Info,
        title: 'New Invoice',
        body: `Invoice #${event.data.invoiceNumber} for ${event.data.total} ${event.data.currency} has been created`,
        data: {
          invoiceId: event.data.invoiceId,
          invoiceNumber: event.data.invoiceNumber,
          total: event.data.total,
          currency: event.data.currency,
          dueDate: event.data.dueDate,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };

    await this.sendNotification(notification);
  }

  @OnEvent('invoice.finalized')
  async handleInvoiceFinalized(): Promise<void> {
    // InvoiceFinalizedEventData only has invoiceId, skip notification
    // The invoice.created event already notified the user
    this.logger.debug('Invoice finalized - no notification needed');
  }

  @OnEvent('invoice.paid')
  async handleInvoicePaid(
    event: ProjectedEvent<InvoicePaidEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) return;

    const notification = {
      target: NotificationTarget.User,
      userIds: [event.aggregateId], // Use aggregateId as we don't have companyId in PaidEventData
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Payment,
        severity: NotificationSeverity.Success,
        title: 'Invoice Paid',
        body: 'Your invoice has been paid successfully',
        data: {
          invoiceId: event.data.invoiceId,
          paymentId: event.data.paymentId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };

    await this.sendNotification(notification);
  }

  @OnEvent('invoice.voided')
  async handleInvoiceVoided(
    event: ProjectedEvent<InvoiceVoidedEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) return;

    const notification = {
      target: NotificationTarget.User,
      userIds: [event.aggregateId], // Use aggregateId as we don't have companyId in VoidedEventData
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Payment,
        severity: NotificationSeverity.Info,
        title: 'Invoice Voided',
        body: event.data.reason || 'Your invoice has been voided',
        data: {
          invoiceId: event.data.invoiceId,
          reason: event.data.reason,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };

    await this.sendNotification(notification);
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
