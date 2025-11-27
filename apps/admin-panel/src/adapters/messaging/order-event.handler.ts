/**
 * Order Event Handler
 *
 * Handles order events from RabbitMQ and coordinates inventory operations.
 * This is the cross-service integration point where Order Service events
 * trigger Inventory Service actions.
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
  CommandBus,
  OutboxService,
} from '@flexobo/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ReserveStockByProductCommand,
  ReleaseReservationByOrderCommand,
} from '../../application/commands/inventory.commands';
import {
  IInventoryReadModelRepository,
  INVENTORY_READ_MODEL_REPOSITORY,
} from '../../ports/inventory-read-model.port';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  INVENTORY_EVENTS,
} from '../../domain/events/event.constants';

/**
 * Order event payload structure
 */
interface OrderEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: {
    userId?: string;
    items?: Array<{
      productId: string;
      productName: string;
      quantity: number;
      priceAmount: number;
      priceCurrency: string;
    }>;
    reason?: string;
    trackingNumber?: string;
  };
  metadata?: Record<string, unknown>;
}

@Injectable()
export class OrderEventHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderEventHandler.name);
  private isSubscribed = false;

  constructor(
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer,
    private readonly commandBus: CommandBus,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(INVENTORY_READ_MODEL_REPOSITORY)
    private readonly inventoryReadModel: IInventoryReadModelRepository
  ) {}

  async onModuleInit() {
    await this.subscribeToOrderEvents();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe('admin-panel.order-events');
    }
  }

  /**
   * Subscribe to order events from RabbitMQ
   */
  private async subscribeToOrderEvents(): Promise<void> {
    try {
      await this.rabbitMQConsumer.subscribeToEvents(
        'admin-panel.order-events',
        [
          ROUTING_KEYS.ORDER.CONFIRMED,
          ROUTING_KEYS.ORDER.CANCELLED,
          ROUTING_KEYS.ORDER.SHIPPED,
        ],
        async (message: IncomingMessage) => {
          await this.handleOrderEvent(message);
        },
        {
          durable: true,
          maxRetries: 3,
        }
      );

      this.isSubscribed = true;
      this.logger.log('Subscribed to order events from RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to subscribe to order events', error);
    }
  }

  /**
   * Handle incoming order event
   */
  private async handleOrderEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as OrderEventPayload;
    const routingKey = message.metadata.routingKey || '';

    this.logger.debug(
      `Received order event: ${routingKey} for order ${payload.aggregateId}`
    );

    try {
      switch (payload.type) {
        case EVENT_TYPES.ORDER.CONFIRMED:
          await this.handleOrderConfirmed(payload);
          break;

        case EVENT_TYPES.ORDER.CANCELLED:
          await this.handleOrderCancelled(payload);
          break;

        case EVENT_TYPES.ORDER.SHIPPED:
          await this.handleOrderShipped(payload);
          break;

        default:
          this.logger.warn(`Unknown order event type: ${payload.type}`);
      }

      // Acknowledge the message
      message.ack();
    } catch (error) {
      this.logger.error(
        `Error handling order event ${payload.type}: ${error}`
      );
      // Negative acknowledge - will be retried
      message.nack(true);
    }
  }

  /**
   * Handle OrderConfirmed event
   * Reserves inventory for all items in the order
   */
  private async handleOrderConfirmed(
    payload: OrderEventPayload
  ): Promise<void> {
    const orderId = payload.aggregateId;
    const items = payload.data.items || [];

    this.logger.log(
      `Processing OrderConfirmed for order ${orderId} with ${items.length} items`
    );

    const reservationResults: Array<{
      productId: string;
      success: boolean;
      quantity: number;
    }> = [];

    // Try to reserve stock for each item
    for (const item of items) {
      const command = new ReserveStockByProductCommand(
        item.productId,
        orderId,
        item.quantity,
        30 // 30 minutes expiration
      );

      const result = await this.commandBus.execute(command);

      reservationResults.push({
        productId: item.productId,
        success: result.isSuccess && result.value === true,
        quantity: item.quantity,
      });
    }

    // Check if all reservations were successful
    const allSuccessful = reservationResults.every((r) => r.success);
    const failedItems = reservationResults.filter((r) => !r.success);

    if (allSuccessful) {
      // Publish InventoryReserved event
      await this.publishInventoryReservedEvent(orderId, reservationResults);
      this.logger.log(`Inventory reserved for order ${orderId}`);
    } else {
      // Release any successful reservations (compensation)
      for (const result of reservationResults.filter((r) => r.success)) {
        try {
          const releaseCommand = new ReleaseReservationByOrderCommand(
            orderId,
            'Partial reservation failure - compensation'
          );
          await this.commandBus.execute(releaseCommand);
        } catch (err) {
          this.logger.error(
            `Failed to release reservation for product ${result.productId}`,
            err
          );
        }
      }

      // Publish InventoryReservationFailed event
      await this.publishInventoryReservationFailedEvent(
        orderId,
        failedItems.map((f) => f.productId)
      );
      this.logger.warn(
        `Inventory reservation failed for order ${orderId}`
      );
    }
  }

  /**
   * Handle OrderCancelled event
   * Releases any reserved inventory
   */
  private async handleOrderCancelled(
    payload: OrderEventPayload
  ): Promise<void> {
    const orderId = payload.aggregateId;
    const reason = payload.data.reason || 'Order cancelled';

    this.logger.log(
      `Processing OrderCancelled for order ${orderId}`
    );

    const command = new ReleaseReservationByOrderCommand(orderId, reason);
    const result = await this.commandBus.execute(command);

    if (result.isSuccess) {
      this.logger.log(
        `Inventory reservation released for cancelled order ${orderId}`
      );
    } else {
      this.logger.warn(
        `Failed to release reservation for order ${orderId}: ${result.error?.message}`
      );
    }
  }

  /**
   * Handle OrderShipped event
   * Could be used for additional inventory tracking
   */
  private async handleOrderShipped(
    payload: OrderEventPayload
  ): Promise<void> {
    const orderId = payload.aggregateId;
    const trackingNumber = payload.data.trackingNumber;

    this.logger.log(
      `Processing OrderShipped for order ${orderId} (tracking: ${trackingNumber})`
    );

    // Emit local event for any additional processing
    this.eventEmitter.emit(INVENTORY_EVENTS.ORDER_SHIPPED, {
      orderId,
      trackingNumber,
    });
  }

  /**
   * Publish InventoryReserved event to RabbitMQ
   */
  private async publishInventoryReservedEvent(
    orderId: string,
    reservations: Array<{
      productId: string;
      success: boolean;
      quantity: number;
    }>
  ): Promise<void> {
    const event = {
      type: EVENT_TYPES.INVENTORY.RESERVED,
      aggregateId: orderId,
      aggregateType: 'InventoryReservation',
      version: 1,
      occurredAt: new Date(),
      data: {
        orderId,
        reservations: reservations.map((r) => ({
          productId: r.productId,
          quantity: r.quantity,
        })),
        reservedAt: new Date().toISOString(),
      },
    };

    // Save to outbox for publishing
    await this.outboxService.saveEvent(
      event,
      orderId,
      'InventoryReservation'
    );

    // Also emit locally
    this.eventEmitter.emit(INVENTORY_EVENTS.RESERVED, event);
  }

  /**
   * Publish InventoryReservationFailed event to RabbitMQ
   */
  private async publishInventoryReservationFailedEvent(
    orderId: string,
    failedProductIds: string[]
  ): Promise<void> {
    const event = {
      type: EVENT_TYPES.INVENTORY.RESERVATION_FAILED,
      aggregateId: orderId,
      aggregateType: 'InventoryReservation',
      version: 1,
      occurredAt: new Date(),
      data: {
        orderId,
        failedProductIds,
        reason: 'Insufficient stock',
        failedAt: new Date().toISOString(),
      },
    };

    // Save to outbox for publishing
    await this.outboxService.saveEvent(
      event,
      orderId,
      'InventoryReservation'
    );

    // Also emit locally
    this.eventEmitter.emit(INVENTORY_EVENTS.RESERVATION_FAILED, event);
  }
}
