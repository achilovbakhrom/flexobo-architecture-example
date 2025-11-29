/**
 * Order Event Consumer (Projection)
 *
 * Subscribes to order events from RabbitMQ and updates the read model.
 * This is a projection in the CQRS pattern - it listens to events published
 * by the outbox worker and updates the denormalized read model for queries.
 *
 * Flow:
 * 1. Command handler saves aggregate -> events go to outbox
 * 2. OutboxWorker publishes events to RabbitMQ
 * 3. This consumer receives events and updates read model
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
  IOrderReadModelRepository,
  ORDER_READ_MODEL_REPOSITORY,
} from '../../ports/order-read-model.port';
import { OrderItemDto } from '../../application/dto/order.dto';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../domain/events/event.constants';
import { randomUUID } from 'crypto';

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
export class OrderEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderEventConsumer.name);
  private isSubscribed = false;

  constructor(
    @Inject(ORDER_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IOrderReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribeToOrderEvents();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.ORDER.PROJECTIONS);
    }
  }

  /**
   * Subscribe to order events from RabbitMQ
   * Fails fast if RabbitMQ is not connected
   */
  private async subscribeToOrderEvents(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error(
        'RabbitMQ is not connected. Cannot start order event consumer.'
      );
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.ORDER.PROJECTIONS,
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
      `Order projection subscribed to queue: ${QUEUES.ORDER.PROJECTIONS}`
    );
  }

  /**
   * Route incoming order event to appropriate handler
   */
  private async handleOrderEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as OrderEventPayload;

    this.logger.debug(
      `Received order event: ${payload.type} for aggregate ${payload.aggregateId} (version: ${payload.version})`
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

      case EVENT_TYPES.ORDER.PAID:
        await this.handleOrderPaid(payload);
        break;

      default:
        this.logger.warn(`Unknown order event type: ${payload.type}`);
    }
  }

  private async handleOrderCreated(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Processing OrderCreated: ${event.aggregateId} (version: ${event.version})`
    );

    await this.readModelRepository.upsert(
      {
        id: event.aggregateId,
        userId: event.data['userId'] as string,
        status: 'DRAFT',
        totalAmount: 0,
        currency: (event.data['currency'] as string) || 'USD',
        itemCount: 0,
        trackingNumber: null,
        updatedAt: new Date(),
      },
      { version: event.version }
    );
  }

  private async handleOrderItemAdded(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Processing OrderItemAdded: ${event.aggregateId} (version: ${event.version})`
    );

    const item = event.data['item'] as OrderItemDto;

    await this.readModelRepository.saveItem({
      id: randomUUID(),
      orderId: event.aggregateId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      priceAmount: item.priceAmount,
      priceCurrency: item.priceCurrency,
    });

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      const totalAmount = order.items.reduce(
        (sum, i) => sum + i.priceAmount * i.quantity,
        0
      );

      await this.readModelRepository.upsert(
        {
          id: order.id,
          userId: order.userId,
          status: order.status,
          totalAmount,
          currency: order.currency,
          itemCount: order.items.length,
          trackingNumber: order.trackingNumber,
          updatedAt: new Date(),
        },
        { version: event.version }
      );
    }
  }

  private async handleOrderConfirmed(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Processing OrderConfirmed: ${event.aggregateId} (version: ${event.version})`
    );

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert(
        {
          id: order.id,
          userId: order.userId,
          status: 'AWAITING_INVENTORY',
          totalAmount: order.totalAmount,
          currency: order.currency,
          itemCount: order.itemCount,
          trackingNumber: order.trackingNumber,
          updatedAt: new Date(),
        },
        { version: event.version }
      );
    }
  }

  private async handleOrderCancelled(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Processing OrderCancelled: ${event.aggregateId} (version: ${event.version})`
    );

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert(
        {
          id: order.id,
          userId: order.userId,
          status: 'CANCELLED',
          totalAmount: order.totalAmount,
          currency: order.currency,
          itemCount: order.itemCount,
          trackingNumber: order.trackingNumber,
          updatedAt: new Date(),
        },
        { version: event.version }
      );
    }
  }

  private async handleOrderShipped(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Processing OrderShipped: ${event.aggregateId} (version: ${event.version})`
    );

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert(
        {
          id: order.id,
          userId: order.userId,
          status: 'SHIPPED',
          totalAmount: order.totalAmount,
          currency: order.currency,
          itemCount: order.itemCount,
          trackingNumber: event.data['trackingNumber'] as string,
          updatedAt: new Date(),
        },
        { version: event.version }
      );
    }
  }

  private async handleOrderInventoryReserved(
    event: OrderEventPayload
  ): Promise<void> {
    this.logger.debug(
      `Processing OrderInventoryReserved: ${event.aggregateId} (version: ${event.version})`
    );

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert(
        {
          id: order.id,
          userId: order.userId,
          status: 'INVENTORY_RESERVED',
          totalAmount: order.totalAmount,
          currency: order.currency,
          itemCount: order.itemCount,
          trackingNumber: order.trackingNumber,
          updatedAt: new Date(),
        },
        { version: event.version }
      );
    }
  }

  private async handleOrderInventoryFailed(
    event: OrderEventPayload
  ): Promise<void> {
    this.logger.debug(
      `Processing OrderInventoryFailed: ${event.aggregateId} (version: ${event.version})`
    );

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert(
        {
          id: order.id,
          userId: order.userId,
          status: 'INVENTORY_FAILED',
          totalAmount: order.totalAmount,
          currency: order.currency,
          itemCount: order.itemCount,
          trackingNumber: order.trackingNumber,
          updatedAt: new Date(),
        },
        { version: event.version }
      );
    }
  }

  private async handleOrderPaid(event: OrderEventPayload): Promise<void> {
    this.logger.debug(
      `Processing OrderPaid: ${event.aggregateId} (version: ${event.version})`
    );

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert(
        {
          id: order.id,
          userId: order.userId,
          status: 'PAID',
          totalAmount: order.totalAmount,
          currency: order.currency,
          itemCount: order.itemCount,
          trackingNumber: order.trackingNumber,
          updatedAt: new Date(),
        },
        { version: event.version }
      );
    }
  }
}
