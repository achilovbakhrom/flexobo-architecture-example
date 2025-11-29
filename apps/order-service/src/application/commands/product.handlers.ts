/**
 * Product command handlers (Event-Sourced)
 *
 * Product is now event-sourced. Handlers load/create aggregates,
 * apply commands, and persist events.
 */

import { CommandHandler, ICommandHandler, Result, Success } from '@flexobo/core';
import {
  IProductEventRepository,
  IProductReadModelRepository,
  PRODUCT_EVENT_REPOSITORY,
  PRODUCT_READ_MODEL_REPOSITORY,
} from '../../ports/product.repository.port';
import { Product } from '../../domain/product.aggregate';
import { ProductDto } from '../dto/product.dto';
import {
  CreateProductCommand,
  UpdateProductCommand,
  DeleteProductCommand,
  UpdateProductStockCommand,
} from './product.commands';
import { Inject } from '@nestjs/common';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler
  implements ICommandHandler<CreateProductCommand, ProductDto>
{
  constructor(
    @Inject(PRODUCT_EVENT_REPOSITORY)
    private readonly eventRepository: IProductEventRepository,
    @Inject(PRODUCT_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IProductReadModelRepository
  ) {}

  async execute(
    command: CreateProductCommand
  ): Promise<Result<ProductDto, Error>> {
    try {
      // Check if SKU already exists
      const existing = await this.readModelRepository.findBySku(command.sku);
      if (existing) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Product with SKU ${command.sku} already exists`),
        };
      }

      // Create aggregate
      const product = Product.create(
        command.productId,
        command.sku,
        command.name,
        command.priceAmount,
        command.currency ?? 'USD',
        {
          description: command.description,
          category: command.category,
          stockLevel: command.stockLevel,
          imageUrl: command.imageUrl,
        }
      );

      // Get uncommitted events and persist
      const events = product.getUncommittedEvents();
      await this.eventRepository.appendEvents(
        command.productId,
        events.map((e) => ({
          type: e.type,
          data: e.data,
          aggregateType: 'Product',
        })),
        0 // New aggregate starts at version 0
      );

      // Return current state
      const details = product.getDetails();
      return new Success({
        id: details.id,
        sku: details.sku,
        name: details.name,
        description: details.description ?? null,
        category: details.category ?? null,
        priceAmount: details.price.amount,
        currency: details.price.currency,
        stockLevel: details.stockLevel,
        isActive: details.isActive,
        imageUrl: details.imageUrl ?? null,
        metadata: details.metadata ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler
  implements ICommandHandler<UpdateProductCommand, ProductDto>
{
  constructor(
    @Inject(PRODUCT_EVENT_REPOSITORY)
    private readonly eventRepository: IProductEventRepository
  ) {}

  async execute(
    command: UpdateProductCommand
  ): Promise<Result<ProductDto, Error>> {
    try {
      // Load aggregate from events
      const events = await this.eventRepository.getEvents(command.productId);
      if (events.length === 0) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Product ${command.productId} not found`),
        };
      }

      const product = Product.fromEvents(
        events.map((e) => ({
          type: e.eventType,
          aggregateId: e.aggregateId,
          aggregateType: e.aggregateType,
          version: e.version,
          occurredAt: e.occurredAt,
          data: e.eventData,
        }))
      );

      const currentVersion = product.version;

      // Apply update
      product.update({
        name: command.name,
        description: command.description,
        category: command.category,
        priceAmount: command.priceAmount,
        currency: command.currency,
        imageUrl: command.imageUrl,
      });

      // Handle activation/deactivation
      if (command.isActive !== undefined) {
        if (command.isActive) {
          product.activate();
        } else {
          product.deactivate();
        }
      }

      // Handle stock update if provided
      if (command.stockLevel !== undefined) {
        product.updateStock(command.stockLevel);
      }

      // Persist new events
      const newEvents = product.getUncommittedEvents();
      if (newEvents.length > 0) {
        await this.eventRepository.appendEvents(
          command.productId,
          newEvents.map((e) => ({
            type: e.type,
            data: e.data,
            aggregateType: 'Product',
          })),
          currentVersion
        );
      }

      // Return current state
      const details = product.getDetails();
      return new Success({
        id: details.id,
        sku: details.sku,
        name: details.name,
        description: details.description ?? null,
        category: details.category ?? null,
        priceAmount: details.price.amount,
        currency: details.price.currency,
        stockLevel: details.stockLevel,
        isActive: details.isActive,
        imageUrl: details.imageUrl ?? null,
        metadata: details.metadata ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler
  implements ICommandHandler<DeleteProductCommand, boolean>
{
  constructor(
    @Inject(PRODUCT_EVENT_REPOSITORY)
    private readonly eventRepository: IProductEventRepository
  ) {}

  async execute(
    command: DeleteProductCommand
  ): Promise<Result<boolean, Error>> {
    try {
      // Load aggregate from events
      const events = await this.eventRepository.getEvents(command.productId);
      if (events.length === 0) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Product ${command.productId} not found`),
        };
      }

      const product = Product.fromEvents(
        events.map((e) => ({
          type: e.eventType,
          aggregateId: e.aggregateId,
          aggregateType: e.aggregateType,
          version: e.version,
          occurredAt: e.occurredAt,
          data: e.eventData,
        }))
      );

      const currentVersion = product.version;

      // Apply delete (soft delete)
      product.delete();

      // Persist new events
      const newEvents = product.getUncommittedEvents();
      if (newEvents.length > 0) {
        await this.eventRepository.appendEvents(
          command.productId,
          newEvents.map((e) => ({
            type: e.type,
            data: e.data,
            aggregateType: 'Product',
          })),
          currentVersion
        );
      }

      return new Success(true);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(UpdateProductStockCommand)
export class UpdateProductStockHandler
  implements ICommandHandler<UpdateProductStockCommand, void>
{
  constructor(
    @Inject(PRODUCT_EVENT_REPOSITORY)
    private readonly eventRepository: IProductEventRepository
  ) {}

  async execute(
    command: UpdateProductStockCommand
  ): Promise<Result<void, Error>> {
    try {
      // Load aggregate from events
      const events = await this.eventRepository.getEvents(command.productId);
      if (events.length === 0) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Product ${command.productId} not found`),
        };
      }

      const product = Product.fromEvents(
        events.map((e) => ({
          type: e.eventType,
          aggregateId: e.aggregateId,
          aggregateType: e.aggregateType,
          version: e.version,
          occurredAt: e.occurredAt,
          data: e.eventData,
        }))
      );

      const currentVersion = product.version;

      // Apply stock update
      product.updateStock(command.quantity);

      // Persist new events
      const newEvents = product.getUncommittedEvents();
      if (newEvents.length > 0) {
        await this.eventRepository.appendEvents(
          command.productId,
          newEvents.map((e) => ({
            type: e.type,
            data: e.data,
            aggregateType: 'Product',
          })),
          currentVersion
        );
      }

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}
