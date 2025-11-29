/**
 * Inventory Projection Handler
 *
 * Listens to inventory domain events and updates the read model.
 * This is essential for CQRS - the read model must be updated
 * whenever domain events occur.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IInventoryReadModelRepository,
  INVENTORY_READ_MODEL_REPOSITORY,
} from '../../ports/inventory-read-model.port';

interface InventoryEventPayload {
  aggregateId: string;
  eventType: string;
  data: Record<string, unknown>;
  version: number;
}

@Injectable()
export class InventoryProjectionHandler {
  private readonly logger = new Logger(InventoryProjectionHandler.name);

  constructor(
    @Inject(INVENTORY_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IInventoryReadModelRepository
  ) {}

  @OnEvent('inventory.itemcreated')
  async onInventoryItemCreated(event: InventoryEventPayload): Promise<void> {
    this.logger.log(
      `Processing InventoryItemCreated for ${event.aggregateId}`
    );

    try {
      const initialStock = (event.data['initialStock'] as number) ?? 0;

      await this.readModelRepository.upsert({
        id: event.aggregateId,
        productId: event.data['productId'] as string,
        sku: event.data['sku'] as string,
        productName: event.data['productName'] as string,
        totalStock: initialStock,
        reservedStock: 0,
        availableStock: initialStock,
        version: event.version,
        lastEventId: undefined,
      });

      this.logger.log(
        `Read model updated for inventory ${event.aggregateId} (product: ${event.data['productId']})`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update read model for InventoryItemCreated: ${error}`
      );
      throw error;
    }
  }

  @OnEvent('inventory.added')
  async onStockAdded(event: InventoryEventPayload): Promise<void> {
    this.logger.log(`Processing StockAdded for ${event.aggregateId}`);

    try {
      const existing = await this.readModelRepository.findById(
        event.aggregateId
      );

      if (!existing) {
        this.logger.warn(
          `Inventory ${event.aggregateId} not found in read model for StockAdded event`
        );
        return;
      }

      const newTotal = event.data['newTotal'] as number;
      const availableStock = newTotal - existing.reservedStock;

      await this.readModelRepository.upsert({
        id: event.aggregateId,
        productId: existing.productId,
        sku: existing.sku,
        productName: existing.productName,
        totalStock: newTotal,
        reservedStock: existing.reservedStock,
        availableStock,
        version: event.version,
        lastEventId: undefined,
      });

      this.logger.log(
        `Read model updated for StockAdded: inventory ${event.aggregateId}, new total: ${newTotal}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update read model for StockAdded: ${error}`
      );
      throw error;
    }
  }

  @OnEvent('inventory.reserved')
  async onStockReserved(event: InventoryEventPayload): Promise<void> {
    this.logger.log(`Processing StockReserved for ${event.aggregateId}`);

    try {
      const existing = await this.readModelRepository.findById(
        event.aggregateId
      );

      if (!existing) {
        this.logger.warn(
          `Inventory ${event.aggregateId} not found in read model for StockReserved event`
        );
        return;
      }

      const quantity = event.data['quantity'] as number;
      const orderId = event.data['orderId'] as string;
      const expiresAt = new Date(event.data['expiresAt'] as string);
      const newReservedStock = existing.reservedStock + quantity;
      const availableStock = existing.totalStock - newReservedStock;

      await this.readModelRepository.upsert({
        id: event.aggregateId,
        productId: existing.productId,
        sku: existing.sku,
        productName: existing.productName,
        totalStock: existing.totalStock,
        reservedStock: newReservedStock,
        availableStock,
        version: event.version,
        lastEventId: undefined,
      });

      await this.readModelRepository.saveReservation({
        inventoryId: event.aggregateId,
        orderId,
        quantity,
        status: 'PENDING',
        reservedAt: new Date(),
        expiresAt,
      });

      this.logger.log(
        `Read model updated for StockReserved: inventory ${event.aggregateId}, order ${orderId}, quantity ${quantity}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update read model for StockReserved: ${error}`
      );
      throw error;
    }
  }

  @OnEvent('inventory.reservationfailed')
  async onStockReservationFailed(event: InventoryEventPayload): Promise<void> {
    this.logger.log(
      `Processing StockReservationFailed for ${event.aggregateId}`
    );
    // No read model update needed for failed reservations
    // Just log it for debugging purposes
    this.logger.warn(
      `Stock reservation failed for order ${event.data['orderId']}: ${event.data['reason']}`
    );
  }

  @OnEvent('inventory.reservationconfirmed')
  async onStockReservationConfirmed(
    event: InventoryEventPayload
  ): Promise<void> {
    this.logger.log(
      `Processing StockReservationConfirmed for ${event.aggregateId}`
    );

    try {
      const existing = await this.readModelRepository.findById(
        event.aggregateId
      );

      if (!existing) {
        this.logger.warn(
          `Inventory ${event.aggregateId} not found in read model for StockReservationConfirmed event`
        );
        return;
      }

      const orderId = event.data['orderId'] as string;
      const quantity = event.data['quantity'] as number;
      const newTotalStock = event.data['newTotalStock'] as number;
      const newReservedStock = existing.reservedStock - quantity;
      const availableStock = newTotalStock - newReservedStock;

      await this.readModelRepository.upsert({
        id: event.aggregateId,
        productId: existing.productId,
        sku: existing.sku,
        productName: existing.productName,
        totalStock: newTotalStock,
        reservedStock: newReservedStock,
        availableStock,
        version: event.version,
        lastEventId: undefined,
      });

      await this.readModelRepository.updateReservationStatus(
        event.aggregateId,
        orderId,
        'CONFIRMED',
        new Date(),
        undefined
      );

      this.logger.log(
        `Read model updated for StockReservationConfirmed: inventory ${event.aggregateId}, order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update read model for StockReservationConfirmed: ${error}`
      );
      throw error;
    }
  }

  @OnEvent('inventory.reservationreleased')
  async onStockReservationReleased(
    event: InventoryEventPayload
  ): Promise<void> {
    this.logger.log(
      `Processing StockReservationReleased for ${event.aggregateId}`
    );

    try {
      const existing = await this.readModelRepository.findById(
        event.aggregateId
      );

      if (!existing) {
        this.logger.warn(
          `Inventory ${event.aggregateId} not found in read model for StockReservationReleased event`
        );
        return;
      }

      const orderId = event.data['orderId'] as string;
      const quantity = event.data['quantity'] as number;
      const newReservedStock = existing.reservedStock - quantity;
      const availableStock = existing.totalStock - newReservedStock;

      await this.readModelRepository.upsert({
        id: event.aggregateId,
        productId: existing.productId,
        sku: existing.sku,
        productName: existing.productName,
        totalStock: existing.totalStock,
        reservedStock: newReservedStock,
        availableStock,
        version: event.version,
        lastEventId: undefined,
      });

      await this.readModelRepository.updateReservationStatus(
        event.aggregateId,
        orderId,
        'RELEASED',
        undefined,
        new Date()
      );

      this.logger.log(
        `Read model updated for StockReservationReleased: inventory ${event.aggregateId}, order ${orderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update read model for StockReservationReleased: ${error}`
      );
      throw error;
    }
  }
}
