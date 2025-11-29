export const INVENTORY_READ_MODEL_REPOSITORY = Symbol(
  'INVENTORY_READ_MODEL_REPOSITORY'
);

export interface InventoryReadModelDto {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  version: number;
  lastEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockReservationReadModelDto {
  id: string;
  inventoryId: string;
  orderId: string;
  quantity: number;
  status: string;
  reservedAt: Date;
  expiresAt: Date;
  releasedAt?: Date;
  confirmedAt?: Date;
}

export interface InventoryWithReservationsDto extends InventoryReadModelDto {
  reservations: StockReservationReadModelDto[];
}

export interface UpsertInventoryData {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  version: number;
  lastEventId?: string;
}

export interface IInventoryReadModelRepository {
  findById(inventoryId: string): Promise<InventoryWithReservationsDto | null>;

  findByProductId(
    productId: string
  ): Promise<InventoryWithReservationsDto | null>;

  findBySku(sku: string): Promise<InventoryWithReservationsDto | null>;

  findLowStock(threshold: number): Promise<InventoryReadModelDto[]>;

  findAll(limit?: number, offset?: number): Promise<InventoryReadModelDto[]>;

  upsert(data: UpsertInventoryData): Promise<void>;

  saveReservation(data: {
    inventoryId: string;
    orderId: string;
    quantity: number;
    status: string;
    reservedAt: Date;
    expiresAt: Date;
  }): Promise<void>;

  updateReservationStatus(
    inventoryId: string,
    orderId: string,
    status: string,
    confirmedAt?: Date,
    releasedAt?: Date
  ): Promise<void>;

  getReservationByOrderId(
    orderId: string
  ): Promise<StockReservationReadModelDto | null>;

  getExpiredReservations(): Promise<StockReservationReadModelDto[]>;

  delete(inventoryId: string): Promise<void>;
}
