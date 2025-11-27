/**
 * Product Event Consumer
 *
 * Consumes product events from the message queue and updates the read model.
 * In production, this would use RabbitMQ, Kafka, or similar message broker.
 * Currently uses NestJS EventEmitter for local development.
 */

import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IProductReadModelRepository,
  PRODUCT_READ_MODEL_REPOSITORY,
} from '../../ports/product.repository.port';
import { PRODUCT_EVENTS } from '../../domain/events/event.constants';

interface ProductEventData {
  aggregateId: string;
  eventType: string;
  data: Record<string, unknown>;
  version: number;
}

@Injectable()
export class ProductEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(ProductEventConsumer.name);

  constructor(
    @Inject(PRODUCT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IProductReadModelRepository
  ) {}

  onModuleInit() {
    this.logger.log('Product event consumer initialized');
  }

  @OnEvent(PRODUCT_EVENTS.CREATED)
  async handleProductCreated(event: ProductEventData): Promise<void> {
    this.logger.debug(`Consuming ProductCreated: ${event.aggregateId}`);

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

  @OnEvent(PRODUCT_EVENTS.UPDATED)
  async handleProductUpdated(event: ProductEventData): Promise<void> {
    this.logger.debug(`Consuming ProductUpdated: ${event.aggregateId}`);

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

  @OnEvent(PRODUCT_EVENTS.STOCK_UPDATED)
  async handleProductStockUpdated(event: ProductEventData): Promise<void> {
    this.logger.debug(`Consuming ProductStockUpdated: ${event.aggregateId}`);

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

  @OnEvent(PRODUCT_EVENTS.ACTIVATED)
  async handleProductActivated(event: ProductEventData): Promise<void> {
    this.logger.debug(`Consuming ProductActivated: ${event.aggregateId}`);

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

  @OnEvent(PRODUCT_EVENTS.DEACTIVATED)
  async handleProductDeactivated(event: ProductEventData): Promise<void> {
    this.logger.debug(`Consuming ProductDeactivated: ${event.aggregateId}`);

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

  @OnEvent(PRODUCT_EVENTS.DELETED)
  async handleProductDeleted(event: ProductEventData): Promise<void> {
    this.logger.debug(`Consuming ProductDeleted: ${event.aggregateId}`);

    // Soft delete - mark as inactive instead of removing
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
