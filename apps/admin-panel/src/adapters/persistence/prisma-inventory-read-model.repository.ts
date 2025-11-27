import { Injectable, Inject } from '@nestjs/common';
import {
  IInventoryReadModelRepository,
  InventoryReadModelDto,
  InventoryWithReservationsDto,
  StockReservationReadModelDto,
  UpsertInventoryData,
} from '../../ports/inventory-read-model.port';

interface InventoryReadModelPrismaClient {
  $queryRaw: <T>(
    query: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>;
  $executeRaw: (
    query: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<number>;
}

export const INVENTORY_READ_MODEL_PRISMA_CLIENT = Symbol(
  'INVENTORY_READ_MODEL_PRISMA_CLIENT'
);

@Injectable()
export class PrismaInventoryReadModelRepository
  implements IInventoryReadModelRepository
{
  constructor(
    @Inject(INVENTORY_READ_MODEL_PRISMA_CLIENT)
    private readonly prisma: InventoryReadModelPrismaClient
  ) {}

  async findById(
    inventoryId: string
  ): Promise<InventoryWithReservationsDto | null> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        product_id: string;
        sku: string;
        product_name: string;
        total_stock: number;
        reserved_stock: number;
        available_stock: number;
        version: number;
        last_event_id: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >`
      SELECT * FROM inventory_read_model WHERE id = ${inventoryId}
    `;

    if (result.length === 0) {
      return null;
    }

    const inventory = result[0];
    const reservations = await this.getReservationsForInventory(inventoryId);

    return {
      id: inventory.id,
      productId: inventory.product_id,
      sku: inventory.sku,
      productName: inventory.product_name,
      totalStock: inventory.total_stock,
      reservedStock: inventory.reserved_stock,
      availableStock: inventory.available_stock,
      version: inventory.version,
      lastEventId: inventory.last_event_id || undefined,
      createdAt: inventory.created_at,
      updatedAt: inventory.updated_at,
      reservations,
    };
  }

  async findByProductId(
    productId: string
  ): Promise<InventoryWithReservationsDto | null> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        product_id: string;
        sku: string;
        product_name: string;
        total_stock: number;
        reserved_stock: number;
        available_stock: number;
        version: number;
        last_event_id: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >`
      SELECT * FROM inventory_read_model WHERE product_id = ${productId}
    `;

    if (result.length === 0) {
      return null;
    }

    const inventory = result[0];
    const reservations = await this.getReservationsForInventory(inventory.id);

    return {
      id: inventory.id,
      productId: inventory.product_id,
      sku: inventory.sku,
      productName: inventory.product_name,
      totalStock: inventory.total_stock,
      reservedStock: inventory.reserved_stock,
      availableStock: inventory.available_stock,
      version: inventory.version,
      lastEventId: inventory.last_event_id || undefined,
      createdAt: inventory.created_at,
      updatedAt: inventory.updated_at,
      reservations,
    };
  }

  async findBySku(sku: string): Promise<InventoryWithReservationsDto | null> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        product_id: string;
        sku: string;
        product_name: string;
        total_stock: number;
        reserved_stock: number;
        available_stock: number;
        version: number;
        last_event_id: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >`
      SELECT * FROM inventory_read_model WHERE sku = ${sku}
    `;

    if (result.length === 0) {
      return null;
    }

    const inventory = result[0];
    const reservations = await this.getReservationsForInventory(inventory.id);

    return {
      id: inventory.id,
      productId: inventory.product_id,
      sku: inventory.sku,
      productName: inventory.product_name,
      totalStock: inventory.total_stock,
      reservedStock: inventory.reserved_stock,
      availableStock: inventory.available_stock,
      version: inventory.version,
      lastEventId: inventory.last_event_id || undefined,
      createdAt: inventory.created_at,
      updatedAt: inventory.updated_at,
      reservations,
    };
  }

  async findLowStock(threshold: number): Promise<InventoryReadModelDto[]> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        product_id: string;
        sku: string;
        product_name: string;
        total_stock: number;
        reserved_stock: number;
        available_stock: number;
        version: number;
        last_event_id: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >`
      SELECT * FROM inventory_read_model
      WHERE available_stock <= ${threshold}
      ORDER BY available_stock ASC
    `;

    return result.map((row) => ({
      id: row.id,
      productId: row.product_id,
      sku: row.sku,
      productName: row.product_name,
      totalStock: row.total_stock,
      reservedStock: row.reserved_stock,
      availableStock: row.available_stock,
      version: row.version,
      lastEventId: row.last_event_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findAll(
    limit = 100,
    offset = 0
  ): Promise<InventoryReadModelDto[]> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        product_id: string;
        sku: string;
        product_name: string;
        total_stock: number;
        reserved_stock: number;
        available_stock: number;
        version: number;
        last_event_id: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >`
      SELECT * FROM inventory_read_model
      ORDER BY product_name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return result.map((row) => ({
      id: row.id,
      productId: row.product_id,
      sku: row.sku,
      productName: row.product_name,
      totalStock: row.total_stock,
      reservedStock: row.reserved_stock,
      availableStock: row.available_stock,
      version: row.version,
      lastEventId: row.last_event_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async upsert(data: UpsertInventoryData): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO inventory_read_model (
        id, product_id, sku, product_name,
        total_stock, reserved_stock, available_stock,
        version, last_event_id, created_at, updated_at
      ) VALUES (
        ${data.id}, ${data.productId}, ${data.sku}, ${data.productName},
        ${data.totalStock}, ${data.reservedStock}, ${data.availableStock},
        ${data.version}, ${data.lastEventId}, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        total_stock = ${data.totalStock},
        reserved_stock = ${data.reservedStock},
        available_stock = ${data.availableStock},
        version = ${data.version},
        last_event_id = ${data.lastEventId},
        updated_at = NOW()
    `;
  }

  async saveReservation(data: {
    inventoryId: string;
    orderId: string;
    quantity: number;
    status: string;
    reservedAt: Date;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO stock_reservations (
        id, inventory_id, order_id, quantity, status, reserved_at, expires_at
      ) VALUES (
        gen_random_uuid(), ${data.inventoryId}, ${data.orderId},
        ${data.quantity}, ${data.status}, ${data.reservedAt}, ${data.expiresAt}
      )
      ON CONFLICT (inventory_id, order_id) DO UPDATE SET
        quantity = ${data.quantity},
        status = ${data.status},
        reserved_at = ${data.reservedAt},
        expires_at = ${data.expiresAt}
    `;
  }

  async updateReservationStatus(
    inventoryId: string,
    orderId: string,
    status: string,
    confirmedAt?: Date,
    releasedAt?: Date
  ): Promise<void> {
    if (confirmedAt) {
      await this.prisma.$executeRaw`
        UPDATE stock_reservations
        SET status = ${status}, confirmed_at = ${confirmedAt}
        WHERE inventory_id = ${inventoryId} AND order_id = ${orderId}
      `;
    } else if (releasedAt) {
      await this.prisma.$executeRaw`
        UPDATE stock_reservations
        SET status = ${status}, released_at = ${releasedAt}
        WHERE inventory_id = ${inventoryId} AND order_id = ${orderId}
      `;
    } else {
      await this.prisma.$executeRaw`
        UPDATE stock_reservations
        SET status = ${status}
        WHERE inventory_id = ${inventoryId} AND order_id = ${orderId}
      `;
    }
  }

  async getReservationByOrderId(
    orderId: string
  ): Promise<StockReservationReadModelDto | null> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        inventory_id: string;
        order_id: string;
        quantity: number;
        status: string;
        reserved_at: Date;
        expires_at: Date;
        released_at: Date | null;
        confirmed_at: Date | null;
      }>
    >`
      SELECT * FROM stock_reservations WHERE order_id = ${orderId}
    `;

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      inventoryId: row.inventory_id,
      orderId: row.order_id,
      quantity: row.quantity,
      status: row.status,
      reservedAt: row.reserved_at,
      expiresAt: row.expires_at,
      releasedAt: row.released_at || undefined,
      confirmedAt: row.confirmed_at || undefined,
    };
  }

  async getExpiredReservations(): Promise<StockReservationReadModelDto[]> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        inventory_id: string;
        order_id: string;
        quantity: number;
        status: string;
        reserved_at: Date;
        expires_at: Date;
        released_at: Date | null;
        confirmed_at: Date | null;
      }>
    >`
      SELECT * FROM stock_reservations
      WHERE status = 'PENDING' AND expires_at < NOW()
    `;

    return result.map((row) => ({
      id: row.id,
      inventoryId: row.inventory_id,
      orderId: row.order_id,
      quantity: row.quantity,
      status: row.status,
      reservedAt: row.reserved_at,
      expiresAt: row.expires_at,
      releasedAt: row.released_at || undefined,
      confirmedAt: row.confirmed_at || undefined,
    }));
  }

  async delete(inventoryId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM inventory_read_model WHERE id = ${inventoryId}
    `;
  }

  private async getReservationsForInventory(
    inventoryId: string
  ): Promise<StockReservationReadModelDto[]> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        inventory_id: string;
        order_id: string;
        quantity: number;
        status: string;
        reserved_at: Date;
        expires_at: Date;
        released_at: Date | null;
        confirmed_at: Date | null;
      }>
    >`
      SELECT * FROM stock_reservations
      WHERE inventory_id = ${inventoryId}
      ORDER BY reserved_at DESC
    `;

    return result.map((row) => ({
      id: row.id,
      inventoryId: row.inventory_id,
      orderId: row.order_id,
      quantity: row.quantity,
      status: row.status,
      reservedAt: row.reserved_at,
      expiresAt: row.expires_at,
      releasedAt: row.released_at || undefined,
      confirmedAt: row.confirmed_at || undefined,
    }));
  }
}
