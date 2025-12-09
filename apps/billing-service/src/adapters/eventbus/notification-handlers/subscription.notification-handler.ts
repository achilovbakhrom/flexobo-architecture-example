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
  SubscriptionCreatedEventData,
  SubscriptionActivatedEventData,
  SubscriptionCancellationScheduledEventData,
  SubscriptionCancelledEventData,
  SubscriptionPastDueEventData,
  SubscriptionExpiredEventData,
} from '../../../domain/events/subscription.events';

interface ProjectedEvent<T> {
  aggregateId: string;
  data: T;
  version: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SubscriptionNotificationHandler {
  private readonly logger = new Logger(SubscriptionNotificationHandler.name);

  constructor(
    @Optional()
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: IMessagePublisher | null,
  ) {}

  @OnEvent('subscription.created')
  async handleSubscriptionCreated(
    event: ProjectedEvent<SubscriptionCreatedEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) {
      this.logger.warn('Message publisher not available, skipping notification');
      return;
    }

    const notification = {
      target: NotificationTarget.User,
      userIds: [event.data.companyId], // Company owner will receive notification
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Subscription,
        severity: NotificationSeverity.Success,
        title: 'Subscription Created',
        body: 'Your subscription has been created successfully',
        data: {
          subscriptionId: event.data.subscriptionId,
          planId: event.data.planId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };

    await this.sendNotification(notification);
  }

  @OnEvent('subscription.activated')
  async handleSubscriptionActivated(
    event: ProjectedEvent<SubscriptionActivatedEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) return;

    const notification = {
      target: NotificationTarget.User,
      userIds: [event.data.companyId],
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Subscription,
        severity: NotificationSeverity.Success,
        title: 'Subscription Activated',
        body: 'Your subscription is now active',
        data: {
          subscriptionId: event.data.subscriptionId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };

    await this.sendNotification(notification);
  }

  @OnEvent('subscription.cancellation_scheduled')
  async handleCancellationScheduled(
    event: ProjectedEvent<SubscriptionCancellationScheduledEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) return;

    const notification = {
      target: NotificationTarget.User,
      userIds: [event.data.companyId],
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Subscription,
        severity: NotificationSeverity.Warning,
        title: 'Subscription Cancellation Scheduled',
        body: 'Your subscription will be cancelled at the end of the current billing period',
        data: {
          subscriptionId: event.data.subscriptionId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };

    await this.sendNotification(notification);
  }

  @OnEvent('subscription.cancelled')
  async handleSubscriptionCancelled(
    event: ProjectedEvent<SubscriptionCancelledEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) return;

    const notification = {
      target: NotificationTarget.User,
      userIds: [event.data.companyId],
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Subscription,
        severity: NotificationSeverity.Info,
        title: 'Subscription Cancelled',
        body: 'Your subscription has been cancelled',
        data: {
          subscriptionId: event.data.subscriptionId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };

    await this.sendNotification(notification);
  }

  @OnEvent('subscription.past_due')
  async handleSubscriptionPastDue(
    event: ProjectedEvent<SubscriptionPastDueEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) return;

    const notification = {
      target: NotificationTarget.User,
      userIds: [event.data.companyId],
      channels: [NotificationChannel.Sse, NotificationChannel.Email, NotificationChannel.Push],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Subscription,
        severity: NotificationSeverity.Error,
        title: 'Payment Past Due',
        body: 'Your subscription payment is past due. Please update your payment method to avoid service interruption.',
        data: {
          subscriptionId: event.data.subscriptionId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };

    await this.sendNotification(notification);
  }

  @OnEvent('subscription.expired')
  async handleSubscriptionExpired(
    event: ProjectedEvent<SubscriptionExpiredEventData>,
  ): Promise<void> {
    if (!this.messagePublisher) return;

    const notification = {
      target: NotificationTarget.User,
      userIds: [event.data.companyId],
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.System,
        category: NotificationCategory.Subscription,
        severity: NotificationSeverity.Error,
        title: 'Subscription Expired',
        body: 'Your subscription has expired. Please renew to continue using premium features.',
        data: {
          subscriptionId: event.data.subscriptionId,
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
