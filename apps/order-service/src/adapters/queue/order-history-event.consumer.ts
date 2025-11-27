/**
 * Order History Event Consumer
 *
 * Consumes all order events and creates audit log entries.
 * In production, this would use RabbitMQ, Kafka, or similar message broker.
 * Currently uses NestJS EventEmitter for local development.
 */

import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IOrderHistoryRepository,
  ORDER_HISTORY_REPOSITORY,
} from '../../ports/order-history.repository.port';
import { ORDER_EVENTS } from '../../domain/events/event.constants';

interface OrderEventData {
  aggregateId: string;
  eventType: string;
  data: Record<string, unknown>;
  version: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class OrderHistoryEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(OrderHistoryEventConsumer.name);

  constructor(
    @Inject(ORDER_HISTORY_REPOSITORY)
    private readonly historyRepository: IOrderHistoryRepository
  ) {}

  onModuleInit() {
    this.logger.log('Order history event consumer initialized');
  }

  @OnEvent(ORDER_EVENTS.CREATED)
  async handleOrderCreated(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderCreated: ${event.aggregateId}`);

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderCreated',
      eventData: event.data,
      newState: 'DRAFT',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }

  @OnEvent(ORDER_EVENTS.ITEM_ADDED)
  async handleOrderItemAdded(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderItemAdded: ${event.aggregateId}`);

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderItemAdded',
      eventData: event.data,
      previousState: 'DRAFT',
      newState: 'DRAFT',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }

  @OnEvent(ORDER_EVENTS.CONFIRMED)
  async handleOrderConfirmed(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderConfirmed: ${event.aggregateId}`);

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderConfirmed',
      eventData: event.data,
      previousState: 'DRAFT',
      newState: 'CONFIRMED',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }

  @OnEvent(ORDER_EVENTS.CANCELLED)
  async handleOrderCancelled(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderCancelled: ${event.aggregateId}`);

    const lastEntry = await this.historyRepository.findLatestByOrderId(
      event.aggregateId
    );

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderCancelled',
      eventData: event.data,
      previousState: lastEntry?.newState ?? 'UNKNOWN',
      newState: 'CANCELLED',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }

  @OnEvent(ORDER_EVENTS.SHIPPED)
  async handleOrderShipped(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderShipped: ${event.aggregateId}`);

    await this.historyRepository.create({
      orderId: event.aggregateId,
      eventType: 'OrderShipped',
      eventData: event.data,
      previousState: 'CONFIRMED',
      newState: 'SHIPPED',
      changedBy: event.metadata?.['userId'] as string | undefined,
      ipAddress: event.metadata?.['ipAddress'] as string | undefined,
      userAgent: event.metadata?.['userAgent'] as string | undefined,
    });
  }
}
