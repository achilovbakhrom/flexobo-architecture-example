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
} from '../../domain/constants/enums';
import { ISSEManager, SSE_MANAGER } from '../../ports/sse-service.port';

interface ProjectionCompletedEvent {
  type: 'SYSTEM';
  category: 'PROJECTION';
  userId: string;
  correlationId?: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  version: number;
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

    if (routingKey.startsWith('projection.completed.')) {
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

  private async handleProjectionCompleted(
    event: ProjectionCompletedEvent
  ): Promise<void> {
    // System notifications are ephemeral - send directly via SSE without persisting
    await this.sseManager.sendToUser(event.userId, {
      type: NotificationType.SYSTEM,
      category: NotificationCategory.PROJECTION,
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
        NotificationType.USER,
        NotificationCategory.SUBSCRIPTION,
        title,
        body,
        [NotificationChannel.SSE, NotificationChannel.PUSH],
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
        NotificationType.USER,
        NotificationCategory.ORDER,
        title,
        body,
        [NotificationChannel.SSE, NotificationChannel.PUSH],
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
        NotificationType.USER,
        NotificationCategory.PAYMENT,
        title,
        body,
        [NotificationChannel.SSE, NotificationChannel.PUSH],
        {
          paymentId: event.paymentId,
          amount: event.amount,
          currency: event.currency,
        }
      )
    );
  }
}
