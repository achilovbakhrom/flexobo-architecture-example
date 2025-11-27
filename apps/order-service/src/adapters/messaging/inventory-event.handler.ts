/**
 * Inventory Event Handler
 *
 * Handles inventory events from RabbitMQ (Admin Panel) and updates order status.
 * This completes the two-way communication between Order Service and Admin Panel.
 *
 * Flow:
 * 1. Order Service confirms order -> publishes OrderConfirmed to RabbitMQ
 * 2. Admin Panel receives OrderConfirmed -> reserves inventory -> publishes InventoryReserved/InventoryReservationFailed
 * 3. Order Service receives inventory event -> updates order status accordingly
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
} from '@flexobo/core';
import {
  MarkInventoryReservedCommand,
  MarkInventoryFailedCommand,
} from '../../application/commands/order.commands';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
} from '../../domain/events/event.constants';

/**
 * Inventory event payload structure
 */
interface InventoryEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: {
    orderId: string;
    reservations?: Array<{
      productId: string;
      quantity: number;
    }>;
    failedProductIds?: string[];
    reason?: string;
    reservedAt?: string;
    failedAt?: string;
  };
  metadata?: Record<string, unknown>;
}

@Injectable()
export class InventoryEventHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryEventHandler.name);
  private isSubscribed = false;

  constructor(
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer,
    private readonly commandBus: CommandBus
  ) {}

  async onModuleInit() {
    await this.subscribeToInventoryEvents();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe('order-service.inventory-events');
    }
  }

  /**
   * Subscribe to inventory events from RabbitMQ
   */
  private async subscribeToInventoryEvents(): Promise<void> {
    try {
      await this.rabbitMQConsumer.subscribeToEvents(
        'order-service.inventory-events',
        [ROUTING_KEYS.INVENTORY.RESERVED, ROUTING_KEYS.INVENTORY.RESERVATION_FAILED],
        async (message: IncomingMessage) => {
          await this.handleInventoryEvent(message);
        },
        {
          durable: true,
          maxRetries: 3,
        }
      );

      this.isSubscribed = true;
      this.logger.log('Subscribed to inventory events from RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to subscribe to inventory events', error);
    }
  }

  /**
   * Handle incoming inventory event
   */
  private async handleInventoryEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as InventoryEventPayload;
    const routingKey = message.metadata.routingKey || '';

    this.logger.debug(
      `Received inventory event: ${routingKey} for order ${payload.data.orderId}`
    );

    try {
      switch (payload.type) {
        case EVENT_TYPES.INVENTORY.RESERVED:
          await this.handleInventoryReserved(payload);
          break;

        case EVENT_TYPES.INVENTORY.RESERVATION_FAILED:
          await this.handleInventoryReservationFailed(payload);
          break;

        default:
          this.logger.warn(`Unknown inventory event type: ${payload.type}`);
      }

      // Acknowledge the message
      message.ack();
    } catch (error) {
      this.logger.error(
        `Error handling inventory event ${payload.type}: ${error}`
      );
      // Negative acknowledge - will be retried
      message.nack(true);
    }
  }

  /**
   * Handle InventoryReserved event
   * Updates order status to INVENTORY_RESERVED
   */
  private async handleInventoryReserved(
    payload: InventoryEventPayload
  ): Promise<void> {
    const orderId = payload.data.orderId;
    const reservations = payload.data.reservations || [];

    this.logger.log(
      `Processing InventoryReserved for order ${orderId} with ${reservations.length} reservations`
    );

    const command = new MarkInventoryReservedCommand(orderId, reservations);
    const result = await this.commandBus.execute(command);

    if (result.isSuccess) {
      this.logger.log(
        `Order ${orderId} marked as inventory reserved`
      );
    } else {
      this.logger.error(
        `Failed to mark order ${orderId} as inventory reserved: ${result.error?.message}`
      );
      throw result.error;
    }
  }

  /**
   * Handle InventoryReservationFailed event
   * Updates order status to INVENTORY_FAILED
   */
  private async handleInventoryReservationFailed(
    payload: InventoryEventPayload
  ): Promise<void> {
    const orderId = payload.data.orderId;
    const failedProductIds = payload.data.failedProductIds || [];
    const reason = payload.data.reason || 'Inventory reservation failed';

    this.logger.log(
      `Processing InventoryReservationFailed for order ${orderId}`
    );

    const command = new MarkInventoryFailedCommand(
      orderId,
      failedProductIds,
      reason
    );
    const result = await this.commandBus.execute(command);

    if (result.isSuccess) {
      this.logger.warn(
        `Order ${orderId} marked as inventory failed: ${reason}`
      );
    } else {
      this.logger.error(
        `Failed to mark order ${orderId} as inventory failed: ${result.error?.message}`
      );
      throw result.error;
    }
  }
}
