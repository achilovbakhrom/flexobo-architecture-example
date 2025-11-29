/**
 * Order History Event Consumer (Projection)
 *
 * Subscribes to order events from RabbitMQ and creates audit log entries.
 * This is a projection in the CQRS pattern - it listens to events published
 * by the outbox worker and creates audit trail records for orders.
 */

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
  IOrderHistoryRepository,
  ORDER_HISTORY_REPOSITORY,
} from '../../ports/order-history.repository.port';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../domain/events/event.constants';

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
export class OrderHistoryEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderHistoryEventConsumer.name);
  private isSubscribed = false;

  constructor(
    @Inject(ORDER_HISTORY_REPOSITORY)
    private readonly historyRepository: IOrderHistoryRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribeToOrderEvents();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.ORDER.HISTORY);
    }
  }

  private async subscribeToOrderEvents(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error(
        'RabbitMQ is not connected. Cannot start order history consumer.'
      );
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.ORDER.HISTORY,
      [ROUTING_KEYS.ORDER.ALL],
      async (message: IncomingMessage) => {
        await this.handleOrderEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(
      `Order history consumer subscribed to queue: ${QUEUES.ORDER.HISTORY}`
    );
  }

  private async handleOrderEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as OrderEventPayload;

    this.logger.debug(
      `Received order event for history: ${payload.type} for aggregate ${payload.aggregateId} (version: ${payload.version})`
    );

    // Framework auto-acks on success, auto-nacks on error
    switch (payload.type) {
      case EVENT_TYPES.ORDER.CREATED:
        await this.handleOrderCreated(payload);
        break;

      case EVENT_TYPES.ORDER.ITEM_ADDED:
        await this.handleOrderItemAdded(payload);
        break;

      case EVENT_TYPES.ORDER.CONFIRMED:
        await this.handleOrderConfirmed(payload);
        break;

      case EVENT_TYPES.ORDER.CANCELLED:
        await this.handleOrderCancelled(payload);
        break;

      case EVENT_TYPES.ORDER.SHIPPED:
        await this.handleOrderShipped(payload);
        break;

      case EVENT_TYPES.ORDER.INVENTORY_RESERVED:
        await this.handleOrderInventoryReserved(payload);
        break;

      case EVENT_TYPES.ORDER.INVENTORY_FAILED:
        await this.handleOrderInventoryFailed(payload);
        break;

      default:
        this.logger.warn(`Unknown order event type for history: ${payload.type}`);
    }
  }

  private async handleOrderCreated(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Recording OrderCreated: ${event.aggregateId} (version: ${event.version})`
    );

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderCreated',
      eventData: event.data,
      version: event.version,
      newState: 'DRAFT',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }

  private async handleOrderItemAdded(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Recording OrderItemAdded: ${event.aggregateId} (version: ${event.version})`
    );

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderItemAdded',
      eventData: event.data,
      version: event.version,
      previousState: 'DRAFT',
      newState: 'DRAFT',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }

  private async handleOrderConfirmed(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Recording OrderConfirmed: ${event.aggregateId} (version: ${event.version})`
    );

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderConfirmed',
      eventData: event.data,
      version: event.version,
      previousState: 'DRAFT',
      newState: 'CONFIRMED',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }

  private async handleOrderCancelled(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Recording OrderCancelled: ${event.aggregateId} (version: ${event.version})`
    );

    const lastEntry = await this.historyRepository.findLatestByOrderId(
      event.aggregateId
    );

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderCancelled',
      eventData: event.data,
      version: event.version,
      previousState: lastEntry?.newState ?? 'UNKNOWN',
      newState: 'CANCELLED',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }

  private async handleOrderShipped(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Recording OrderShipped: ${event.aggregateId} (version: ${event.version})`
    );

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderShipped',
      eventData: event.data,
      version: event.version,
      previousState: 'CONFIRMED',
      newState: 'SHIPPED',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }

  private async handleOrderInventoryReserved(
    event: OrderEventPayload
  ): Promise<void> {
    this.logger.debug(
      `Recording OrderInventoryReserved: ${event.aggregateId} (version: ${event.version})`
    );

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderInventoryReserved',
      eventData: event.data,
      version: event.version,
      previousState: 'AWAITING_INVENTORY',
      newState: 'INVENTORY_RESERVED',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }

  private async handleOrderInventoryFailed(
    event: OrderEventPayload
  ): Promise<void> {
    this.logger.debug(
      `Recording OrderInventoryFailed: ${event.aggregateId} (version: ${event.version})`
    );

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderInventoryFailed',
      eventData: event.data,
      version: event.version,
      previousState: 'AWAITING_INVENTORY',
      newState: 'INVENTORY_FAILED',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }
}
