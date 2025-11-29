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
} from '../../../ports/order-history.repository.port';
import {
  QUEUES,
  ROUTING_KEYS,
  EVENT_TYPES,
} from '../../../domain/events/event.constants';

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
export class OrderHistoryProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderHistoryProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(ORDER_HISTORY_REPOSITORY)
    private readonly historyRepository: IOrderHistoryRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.ORDER.HISTORY);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error('RabbitMQ not connected');
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.ORDER.HISTORY,
      [ROUTING_KEYS.ORDER.ALL],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      { durable: true, maxRetries: 3 }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.ORDER.HISTORY}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as OrderEventPayload;

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
    }
  }

  private async onOrderCreated(event: OrderEventPayload): Promise<void> {
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

  private async onOrderItemAdded(event: OrderEventPayload): Promise<void> {
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

  private async onOrderConfirmed(event: OrderEventPayload): Promise<void> {
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

  private async onOrderCancelled(event: OrderEventPayload): Promise<void> {
    const lastEntry = await this.historyRepository.findLatestByOrderId(event.aggregateId);

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

  private async onOrderShipped(event: OrderEventPayload): Promise<void> {
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

  private async onOrderInventoryReserved(event: OrderEventPayload): Promise<void> {
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

  private async onOrderInventoryFailed(event: OrderEventPayload): Promise<void> {
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
