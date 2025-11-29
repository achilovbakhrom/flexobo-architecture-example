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
} from '../../../application/commands/order.commands';
import {
  QUEUES,
  ROUTING_KEYS,
  EVENT_TYPES,
} from '../../../domain/events/event.constants';

interface InventoryEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: {
    orderId: string;
    reservations?: Array<{ productId: string; quantity: number }>;
    failedProductIds?: string[];
    reason?: string;
  };
  metadata?: Record<string, unknown>;
}

@Injectable()
export class OnInventoryEventsHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OnInventoryEventsHandler.name);
  private isSubscribed = false;

  constructor(
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer,
    private readonly commandBus: CommandBus
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.INVENTORY.HANDLER);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error('RabbitMQ not connected');
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.INVENTORY.HANDLER,
      [ROUTING_KEYS.INVENTORY.RESERVED, ROUTING_KEYS.INVENTORY.RESERVATION_FAILED],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      { durable: true, maxRetries: 3 }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.INVENTORY.HANDLER}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as InventoryEventPayload;

    switch (payload.type) {
      case EVENT_TYPES.INVENTORY.RESERVED:
        await this.onInventoryReserved(payload);
        break;
      case EVENT_TYPES.INVENTORY.RESERVATION_FAILED:
        await this.onInventoryFailed(payload);
        break;
    }
  }

  private async onInventoryReserved(payload: InventoryEventPayload): Promise<void> {
    const { orderId, reservations = [] } = payload.data;

    const command = new MarkInventoryReservedCommand(orderId, reservations);
    const result = await this.commandBus.execute(command);

    if (result.isSuccess) {
      this.logger.log(`Order ${orderId} marked as inventory reserved`);
    } else {
      this.logger.error(`Failed to mark inventory reserved: ${result.error?.message}`);
    }
  }

  private async onInventoryFailed(payload: InventoryEventPayload): Promise<void> {
    const { orderId, failedProductIds = [], reason = 'Inventory reservation failed' } = payload.data;

    const command = new MarkInventoryFailedCommand(orderId, failedProductIds, reason);
    const result = await this.commandBus.execute(command);

    if (result.isSuccess) {
      this.logger.warn(`Order ${orderId} marked as inventory failed: ${reason}`);
    } else {
      this.logger.error(`Failed to mark inventory failed: ${result.error?.message}`);
    }
  }
}
