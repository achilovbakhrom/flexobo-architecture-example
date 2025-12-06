import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { RabbitMQConsumer, MESSAGE_CONSUMER } from '@flexobo/core';
import {
  SendNotificationCommand,
  BroadcastNotificationCommand,
} from '../../application/commands';
import {
  NotificationType,
  NotificationCategory,
  NotificationChannel,
  NotificationSeverity,
} from '../../domain/constants/enums';
import { ISSEManager, SSE_MANAGER } from '../../ports/sse-service.port';

interface ProjectionCompletedEvent {
  type: 'system';
  category: 'projection';
  userId: string;
  correlationId?: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  version: number;
}

/**
 * Notification payload from the new resolver-based system
 */
interface ResolverNotificationPayload {
  target: 'user' | 'broadcast';
  userIds?: string[];
  /** Delivery channels: sse, push, email, sms */
  channels?: ('sse' | 'push' | 'email' | 'sms')[];
  type: 'system' | 'user';
  category: string;
  /** Message severity: info, success, warning, error */
  severity?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface SubscriptionEvent {
  userId: string;
  subscriptionId: string;
  planName?: string;
  expiresAt?: string;
}

interface OrderEvent {
  userId: string;
  orderId: string;
  orderNumber?: string;
  status?: string;
}

interface PaymentEvent {
  userId: string;
  paymentId: string;
  amount?: number;
  currency?: string;
}

@Injectable()
export class ExternalEventHandler implements OnModuleInit {
  private readonly logger = new Logger(ExternalEventHandler.name);

  constructor(
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer,
    private readonly commandBus: CommandBus,
    @Inject(SSE_MANAGER)
    private readonly sseManager: ISSEManager
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      this.logger.warn('RabbitMQ not connected, external event handling disabled');
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      'notification.events',
      [
        // New resolver-based notification patterns
        'notification.user.*',
        'notification.broadcast',
        // Legacy patterns (kept for backward compatibility)
        'projection.completed.*',
        'subscription.expired',
        'subscription.renewed',
        'subscription.created',
        'order.confirmed',
        'order.shipped',
        'order.delivered',
        'payment.succeeded',
        'payment.failed',
      ],
      async (message) => {
        const routingKey = message.metadata?.routingKey as string;

        try {
          await this.handleEvent(routingKey, message.content);
          message.ack();
        } catch (error) {
          this.logger.error(`Failed to handle event ${routingKey}: ${error}`);
          message.nack();
        }
      },
      { durable: true }
    );

    this.logger.log('External event handler initialized');
  }

  private async handleEvent(
    routingKey: string,
    content: unknown
  ): Promise<void> {
    this.logger.debug(`Handling event: ${routingKey}`);

    // New resolver-based notifications
    if (routingKey.startsWith('notification.user.')) {
      await this.handleUserNotification(content as ResolverNotificationPayload);
    } else if (routingKey === 'notification.broadcast') {
      await this.handleBroadcastNotification(
        content as ResolverNotificationPayload
      );
    }
    // Legacy patterns (kept for backward compatibility)
    else if (routingKey.startsWith('projection.completed.')) {
      await this.handleProjectionCompleted(content as ProjectionCompletedEvent);
    } else if (routingKey.startsWith('subscription.')) {
      await this.handleSubscriptionEvent(
        routingKey,
        content as SubscriptionEvent
      );
    } else if (routingKey.startsWith('order.')) {
      await this.handleOrderEvent(routingKey, content as OrderEvent);
    } else if (routingKey.startsWith('payment.')) {
      await this.handlePaymentEvent(routingKey, content as PaymentEvent);
    }
  }

  /**
   * Handle user-targeted notifications from resolver-based system
   */
  private async handleUserNotification(
    payload: ResolverNotificationPayload
  ): Promise<void> {
    const { userIds, channels, type, category, severity, title, body, data } =
      payload;

    if (!userIds || userIds.length === 0) {
      this.logger.warn('User notification received without userIds');
      return;
    }

    // Default to SSE if no channels specified
    const deliveryChannels = channels ?? ['sse'];

    // Map string channels to enum values
    const notificationChannels: NotificationChannel[] = deliveryChannels
      .filter((ch) => ch === 'sse' || ch === 'push')
      .map((ch) =>
        ch === 'sse' ? NotificationChannel.Sse : NotificationChannel.Push
      );

    // Map severity string to enum
    const notificationSeverity = this.mapSeverity(severity);

    // Use SendNotificationCommand for multi-channel delivery
    if (notificationChannels.length > 0) {
      await this.commandBus.execute(
        new SendNotificationCommand(
          uuidv4(),
          userIds,
          type === 'system' ? NotificationType.System : NotificationType.User,
          category as NotificationCategory,
          title || 'Update',
          body || '',
          notificationChannels,
          data,
          notificationSeverity
        )
      );
    }

    // TODO: Handle EMAIL and SMS channels when services are implemented
    if (deliveryChannels.includes('email')) {
      this.logger.debug(
        `Email notification requested for ${userIds.length} user(s) - not yet implemented`
      );
    }
    if (deliveryChannels.includes('sms')) {
      this.logger.debug(
        `SMS notification requested for ${userIds.length} user(s) - not yet implemented`
      );
    }

    this.logger.debug(
      `Sent notification to ${userIds.length} user(s) via ${deliveryChannels.join(', ')}: ${category} [${severity || 'info'}]`
    );
  }

  /**
   * Handle broadcast notifications from resolver-based system
   */
  private async handleBroadcastNotification(
    payload: ResolverNotificationPayload
  ): Promise<void> {
    const { channels, type, category, severity, title, body, data } = payload;

    // Default to SSE for broadcasts, filter to supported channels
    const deliveryChannels = channels ?? ['sse'];
    const notificationChannels: NotificationChannel[] = deliveryChannels
      .filter((ch) => ch === 'sse' || ch === 'push')
      .map((ch) =>
        ch === 'sse' ? NotificationChannel.Sse : NotificationChannel.Push
      );

    // Map severity string to enum
    const notificationSeverity = this.mapSeverity(severity);

    if (notificationChannels.length > 0) {
      await this.commandBus.execute(
        new BroadcastNotificationCommand(
          uuidv4(),
          type === 'system' ? NotificationType.System : NotificationType.User,
          category as NotificationCategory,
          title || 'Announcement',
          body || '',
          notificationChannels,
          data,
          notificationSeverity
        )
      );
    }

    this.logger.debug(
      `Broadcast notification sent via ${deliveryChannels.join(', ')}: ${category} [${severity || 'info'}]`
    );
  }

  /**
   * Maps severity string to NotificationSeverity enum
   */
  private mapSeverity(
    severity?: 'info' | 'success' | 'warning' | 'error'
  ): NotificationSeverity {
    switch (severity) {
      case 'success':
        return NotificationSeverity.Success;
      case 'warning':
        return NotificationSeverity.Warning;
      case 'error':
        return NotificationSeverity.Error;
      case 'info':
      default:
        return NotificationSeverity.Info;
    }
  }

  private async handleProjectionCompleted(
    event: ProjectionCompletedEvent
  ): Promise<void> {
    // System notifications are ephemeral - send directly via SSE without persisting
    await this.sseManager.sendToUser(event.userId, {
      type: NotificationType.System,
      category: NotificationCategory.Projection,
      title: 'Data Updated',
      body: `${event.aggregateType} projection updated`,
      data: {
        correlationId: event.correlationId,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        version: event.version,
      },
    });
  }

  private async handleSubscriptionEvent(
    routingKey: string,
    event: SubscriptionEvent
  ): Promise<void> {
    let title: string;
    let body: string;

    switch (routingKey) {
      case 'subscription.created':
        title = 'Subscription Activated';
        body = `Your ${event.planName || 'subscription'} has been activated.`;
        break;
      case 'subscription.renewed':
        title = 'Subscription Renewed';
        body = `Your ${event.planName || 'subscription'} has been renewed.`;
        break;
      case 'subscription.expired':
        title = 'Subscription Expired';
        body = `Your ${event.planName || 'subscription'} has expired. Renew now to continue.`;
        break;
      default:
        return;
    }

    await this.commandBus.execute(
      new SendNotificationCommand(
        uuidv4(),
        [event.userId],
        NotificationType.User,
        NotificationCategory.Subscription,
        title,
        body,
        [NotificationChannel.Sse, NotificationChannel.Push],
        {
          subscriptionId: event.subscriptionId,
          expiresAt: event.expiresAt,
        }
      )
    );
  }

  private async handleOrderEvent(
    routingKey: string,
    event: OrderEvent
  ): Promise<void> {
    let title: string;
    let body: string;

    switch (routingKey) {
      case 'order.confirmed':
        title = 'Order Confirmed';
        body = `Your order ${event.orderNumber || event.orderId} has been confirmed.`;
        break;
      case 'order.shipped':
        title = 'Order Shipped';
        body = `Your order ${event.orderNumber || event.orderId} has been shipped.`;
        break;
      case 'order.delivered':
        title = 'Order Delivered';
        body = `Your order ${event.orderNumber || event.orderId} has been delivered.`;
        break;
      default:
        return;
    }

    await this.commandBus.execute(
      new SendNotificationCommand(
        uuidv4(),
        [event.userId],
        NotificationType.User,
        NotificationCategory.Order,
        title,
        body,
        [NotificationChannel.Sse, NotificationChannel.Push],
        {
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          status: event.status,
        }
      )
    );
  }

  private async handlePaymentEvent(
    routingKey: string,
    event: PaymentEvent
  ): Promise<void> {
    let title: string;
    let body: string;

    switch (routingKey) {
      case 'payment.succeeded':
        title = 'Payment Successful';
        body = event.amount
          ? `Payment of ${event.currency || '$'}${event.amount} was successful.`
          : 'Your payment was successful.';
        break;
      case 'payment.failed':
        title = 'Payment Failed';
        body = 'Your payment could not be processed. Please try again.';
        break;
      default:
        return;
    }

    await this.commandBus.execute(
      new SendNotificationCommand(
        uuidv4(),
        [event.userId],
        NotificationType.User,
        NotificationCategory.Payment,
        title,
        body,
        [NotificationChannel.Sse, NotificationChannel.Push],
        {
          paymentId: event.paymentId,
          amount: event.amount,
          currency: event.currency,
        }
      )
    );
  }
}
