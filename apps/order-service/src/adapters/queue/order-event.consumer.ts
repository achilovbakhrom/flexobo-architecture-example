/**
 * Order Event Consumer
 *
 * Consumes order events from the message queue and updates the read model.
 * In production, this would use RabbitMQ, Kafka, or similar message broker.
 * Currently uses NestJS EventEmitter for local development.
 */

import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IOrderReadModelRepository,
  ORDER_READ_MODEL_REPOSITORY,
} from '../../ports/order-read-model.port';
import { OrderItemDto } from '../../application/dto/order.dto';
import { ORDER_EVENTS } from '../../domain/events/event.constants';
import { v4 as uuidv4 } from 'uuid';

interface OrderEventData {
  aggregateId: string;
  eventType: string;
  data: Record<string, unknown>;
  version: number;
}

@Injectable()
export class OrderEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(OrderEventConsumer.name);

  constructor(
    @Inject(ORDER_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IOrderReadModelRepository
  ) {}

  onModuleInit() {
    this.logger.log('Order event consumer initialized');
  }

  @OnEvent(ORDER_EVENTS.CREATED)
  async handleOrderCreated(event: OrderEventData): Promise<void> {
    this.logger.debug(`Consuming OrderCreated: ${event.aggregateId}`);

    await this.readModelRepository.upsert({
      id: event.aggregateId,
      userId: event.data['userId'] as string,
      status: 'DRAFT',
      totalAmount: 0,
      currency: (event.data['currency'] as string) || 'USD',
      itemCount: 0,
      trackingNumber: null,
      updatedAt: new Date(),
    });
  }

  @OnEvent(ORDER_EVENTS.ITEM_ADDED)
  async handleOrderItemAdded(event: OrderEventData): Promise<void> {
    this.logger.debug(`Consuming OrderItemAdded: ${event.aggregateId}`);

    const item = event.data['item'] as OrderItemDto;

    await this.readModelRepository.saveItem({
      id: uuidv4(),
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

      await this.readModelRepository.upsert({
        id: order.id,
        userId: order.userId,
        status: order.status,
        totalAmount,
        currency: order.currency,
        itemCount: order.items.length,
        trackingNumber: order.trackingNumber,
        updatedAt: new Date(),
      });
    }
  }

  @OnEvent(ORDER_EVENTS.CONFIRMED)
  async handleOrderConfirmed(event: OrderEventData): Promise<void> {
    this.logger.debug(`Consuming OrderConfirmed: ${event.aggregateId}`);

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert({
        id: order.id,
        userId: order.userId,
        status: 'AWAITING_INVENTORY',
        totalAmount: order.totalAmount,
        currency: order.currency,
        itemCount: order.itemCount,
        trackingNumber: order.trackingNumber,
        updatedAt: new Date(),
      });
    }
  }

  @OnEvent(ORDER_EVENTS.CANCELLED)
  async handleOrderCancelled(event: OrderEventData): Promise<void> {
    this.logger.debug(`Consuming OrderCancelled: ${event.aggregateId}`);

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert({
        id: order.id,
        userId: order.userId,
        status: 'CANCELLED',
        totalAmount: order.totalAmount,
        currency: order.currency,
        itemCount: order.itemCount,
        trackingNumber: order.trackingNumber,
        updatedAt: new Date(),
      });
    }
  }

  @OnEvent(ORDER_EVENTS.SHIPPED)
  async handleOrderShipped(event: OrderEventData): Promise<void> {
    this.logger.debug(`Consuming OrderShipped: ${event.aggregateId}`);

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert({
        id: order.id,
        userId: order.userId,
        status: 'SHIPPED',
        totalAmount: order.totalAmount,
        currency: order.currency,
        itemCount: order.itemCount,
        trackingNumber: event.data['trackingNumber'] as string,
        updatedAt: new Date(),
      });
    }
  }

  @OnEvent(ORDER_EVENTS.INVENTORY_RESERVED)
  async handleOrderInventoryReserved(event: OrderEventData): Promise<void> {
    this.logger.debug(`Consuming OrderInventoryReserved: ${event.aggregateId}`);

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert({
        id: order.id,
        userId: order.userId,
        status: 'INVENTORY_RESERVED',
        totalAmount: order.totalAmount,
        currency: order.currency,
        itemCount: order.itemCount,
        trackingNumber: order.trackingNumber,
        updatedAt: new Date(),
      });
    }
  }

  @OnEvent(ORDER_EVENTS.INVENTORY_FAILED)
  async handleOrderInventoryFailed(event: OrderEventData): Promise<void> {
    this.logger.debug(`Consuming OrderInventoryFailed: ${event.aggregateId}`);

    const order = await this.readModelRepository.findById(event.aggregateId);
    if (order) {
      await this.readModelRepository.upsert({
        id: order.id,
        userId: order.userId,
        status: 'INVENTORY_FAILED',
        totalAmount: order.totalAmount,
        currency: order.currency,
        itemCount: order.itemCount,
        trackingNumber: order.trackingNumber,
        updatedAt: new Date(),
      });
    }
  }
}
