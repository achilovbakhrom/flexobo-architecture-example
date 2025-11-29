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
} from '../../../ports/order-read-model.port';
import { OrderItemDto } from '../../../application/dto/order.dto';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../../domain/events/event.constants';
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
export class OrderProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(ORDER_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IOrderReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.ORDER.PROJECTION);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error(
        'RabbitMQ is not connected. Cannot start order projection.'
      );
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.ORDER.PROJECTION,
      [ROUTING_KEYS.ORDER.ALL],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.ORDER.PROJECTION}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as OrderEventPayload;

    this.logger.debug(
      `[Projection] Order event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case EVENT_TYPES.ORDER.CREATED:
        await this.onOrderCreated(payload);
        break;

      case EVENT_TYPES.ORDER.ITEM_ADDED:
        await this.onOrderItemAdded(payload);
        break;

      case EVENT_TYPES.ORDER.CONFIRMED:
        await this.onOrderConfirmed(payload);
        break;

      case EVENT_TYPES.ORDER.CANCELLED:
        await this.onOrderCancelled(payload);
        break;

      case EVENT_TYPES.ORDER.SHIPPED:
        await this.onOrderShipped(payload);
        break;

      case EVENT_TYPES.ORDER.INVENTORY_RESERVED:
        await this.onOrderInventoryReserved(payload);
        break;

      case EVENT_TYPES.ORDER.INVENTORY_FAILED:
        await this.onOrderInventoryFailed(payload);
        break;

      case EVENT_TYPES.ORDER.PAID:
        await this.onOrderPaid(payload);
        break;

      default:
        this.logger.warn(`Unknown order event type: ${payload.type}`);
    }
  }

  private async onOrderCreated(event: OrderEventPayload): Promise<void> {
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

  private async onOrderItemAdded(event: OrderEventPayload): Promise<void> {
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

  private async onOrderConfirmed(event: OrderEventPayload): Promise<void> {
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

  private async onOrderCancelled(event: OrderEventPayload): Promise<void> {
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

  private async onOrderShipped(event: OrderEventPayload): Promise<void> {
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

  private async onOrderInventoryReserved(event: OrderEventPayload): Promise<void> {
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

  private async onOrderInventoryFailed(event: OrderEventPayload): Promise<void> {
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

  private async onOrderPaid(event: OrderEventPayload): Promise<void> {
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
