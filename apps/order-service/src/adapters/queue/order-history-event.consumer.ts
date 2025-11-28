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
    this.logger.debug(`Recording OrderCreated: ${event.aggregateId} (version: ${event.version})`);

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

  @OnEvent(ORDER_EVENTS.ITEM_ADDED)
  async handleOrderItemAdded(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderItemAdded: ${event.aggregateId} (version: ${event.version})`);

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

  @OnEvent(ORDER_EVENTS.CONFIRMED)
  async handleOrderConfirmed(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderConfirmed: ${event.aggregateId} (version: ${event.version})`);

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

  @OnEvent(ORDER_EVENTS.CANCELLED)
  async handleOrderCancelled(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderCancelled: ${event.aggregateId} (version: ${event.version})`);

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

  @OnEvent(ORDER_EVENTS.SHIPPED)
  async handleOrderShipped(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderShipped: ${event.aggregateId} (version: ${event.version})`);

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

  @OnEvent(ORDER_EVENTS.INVENTORY_RESERVED)
  async handleOrderInventoryReserved(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderInventoryReserved: ${event.aggregateId} (version: ${event.version})`);

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

  @OnEvent(ORDER_EVENTS.INVENTORY_FAILED)
  async handleOrderInventoryFailed(event: OrderEventData): Promise<void> {
    this.logger.debug(`Recording OrderInventoryFailed: ${event.aggregateId} (version: ${event.version})`);

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
