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
  IProductReadModelRepository,
  PRODUCT_READ_MODEL_REPOSITORY,
} from '../../../ports/product.repository.port';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../../domain/events/event.constants';

interface ProductEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ProductProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProductProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(PRODUCT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IProductReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.PRODUCT.PROJECTION);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error(
        'RabbitMQ is not connected. Cannot start product projection.'
      );
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.PRODUCT.PROJECTION,
      [ROUTING_KEYS.PRODUCT.ALL],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Product projection subscribed to queue: ${QUEUES.PRODUCT.PROJECTION}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as ProductEventPayload;

    this.logger.debug(
      `[Projection] Product event: ${payload.type} for ${payload.aggregateId}`
    );

    switch (payload.type) {
      case EVENT_TYPES.PRODUCT.CREATED:
        await this.onProductCreated(payload);
        break;

      case EVENT_TYPES.PRODUCT.UPDATED:
        await this.onProductUpdated(payload);
        break;

      case EVENT_TYPES.PRODUCT.STOCK_UPDATED:
        await this.onProductStockUpdated(payload);
        break;

      case EVENT_TYPES.PRODUCT.ACTIVATED:
        await this.onProductActivated(payload);
        break;

      case EVENT_TYPES.PRODUCT.DEACTIVATED:
        await this.onProductDeactivated(payload);
        break;

      case EVENT_TYPES.PRODUCT.DELETED:
        await this.onProductDeleted(payload);
        break;

      default:
        this.logger.warn(`Unknown product event type: ${payload.type}`);
    }
  }

  private async onProductCreated(event: ProductEventPayload): Promise<void> {
    await this.readModelRepository.upsert({
      id: event.aggregateId,
      sku: event.data['sku'] as string,
      name: event.data['name'] as string,
      description: event.data['description'] as string | undefined,
      category: event.data['category'] as string | undefined,
      priceAmount: event.data['priceAmount'] as number,
      currency: event.data['currency'] as string,
      stockLevel: event.data['stockLevel'] as number,
      isActive: true,
      imageUrl: event.data['imageUrl'] as string | undefined,
      metadata: event.data['metadata'] as Record<string, unknown> | undefined,
      updatedAt: new Date(),
    });
  }

  private async onProductUpdated(event: ProductEventPayload): Promise<void> {
    const product = await this.readModelRepository.findById(event.aggregateId);
    if (product) {
      await this.readModelRepository.upsert({
        id: product.id,
        sku: product.sku,
        name: (event.data['name'] as string) ?? product.name,
        description:
          event.data['description'] !== undefined
            ? (event.data['description'] as string)
            : product.description,
        category:
          event.data['category'] !== undefined
            ? (event.data['category'] as string)
            : product.category,
        priceAmount:
          (event.data['priceAmount'] as number) ?? product.priceAmount,
        currency: (event.data['currency'] as string) ?? product.currency,
        stockLevel: product.stockLevel,
        isActive: product.isActive,
        imageUrl:
          event.data['imageUrl'] !== undefined
            ? (event.data['imageUrl'] as string)
            : product.imageUrl,
        metadata:
          event.data['metadata'] !== undefined
            ? (event.data['metadata'] as Record<string, unknown>)
            : product.metadata,
        updatedAt: new Date(),
      });
    }
  }

  private async onProductStockUpdated(event: ProductEventPayload): Promise<void> {
    const product = await this.readModelRepository.findById(event.aggregateId);
    if (product) {
      await this.readModelRepository.upsert({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        priceAmount: product.priceAmount,
        currency: product.currency,
        stockLevel: event.data['newLevel'] as number,
        isActive: product.isActive,
        imageUrl: product.imageUrl,
        metadata: product.metadata,
        updatedAt: new Date(),
      });
    }
  }

  private async onProductActivated(event: ProductEventPayload): Promise<void> {
    const product = await this.readModelRepository.findById(event.aggregateId);
    if (product) {
      await this.readModelRepository.upsert({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        priceAmount: product.priceAmount,
        currency: product.currency,
        stockLevel: product.stockLevel,
        isActive: true,
        imageUrl: product.imageUrl,
        metadata: product.metadata,
        updatedAt: new Date(),
      });
    }
  }

  private async onProductDeactivated(event: ProductEventPayload): Promise<void> {
    const product = await this.readModelRepository.findById(event.aggregateId);
    if (product) {
      await this.readModelRepository.upsert({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        priceAmount: product.priceAmount,
        currency: product.currency,
        stockLevel: product.stockLevel,
        isActive: false,
        imageUrl: product.imageUrl,
        metadata: product.metadata,
        updatedAt: new Date(),
      });
    }
  }

  private async onProductDeleted(event: ProductEventPayload): Promise<void> {
    const product = await this.readModelRepository.findById(event.aggregateId);
    if (product) {
      await this.readModelRepository.upsert({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        priceAmount: product.priceAmount,
        currency: product.currency,
        stockLevel: product.stockLevel,
        isActive: false,
        imageUrl: product.imageUrl,
        metadata: product.metadata,
        updatedAt: new Date(),
      });
    }
  }
}
