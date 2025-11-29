import { AggregateRoot, DomainEvent } from '@flexobo/core';

export enum StockReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
}

export interface StockReservation {
  orderId: string;
  quantity: number;
  status: StockReservationStatus;
  reservedAt: Date;
  expiresAt: Date;
}

export class Inventory extends AggregateRoot {
  private productId!: string;
  private sku!: string;
  private productName!: string;
  private totalStock = 0;
  private reservedStock = 0;
  private reservations: Map<string, StockReservation> = new Map();

  static create(
    inventoryId: string,
    productId: string,
    sku: string,
    productName: string,
    initialStock = 0
  ): Inventory {
    const inventory = new Inventory(inventoryId);

    const event = inventory.createEvent('InventoryItemCreated', {
      productId,
      sku,
      productName,
      initialStock,
    });

    inventory.addEvent(event);
    inventory.apply(event);

    return inventory;
  }

  static fromEvents(events: DomainEvent[]): Inventory {
    const inventory = new Inventory(events[0].aggregateId);
    inventory.loadFromHistory(events);
    return inventory;
  }

  addStock(quantity: number, reason?: string): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const event = this.createEvent('StockAdded', {
      quantity,
      reason: reason || 'Stock replenishment',
      previousTotal: this.totalStock,
      newTotal: this.totalStock + quantity,
    });

    this.addEvent(event);
    this.apply(event);
  }

  reserveStock(
    orderId: string,
    quantity: number,
    expirationMinutes = 30
  ): boolean {
    const availableStock = this.getAvailableStock();

    if (quantity > availableStock) {
      const failEvent = this.createEvent('StockReservationFailed', {
        orderId,
        requestedQuantity: quantity,
        availableStock,
        reason: 'Insufficient stock',
      });
      this.addEvent(failEvent);
      this.apply(failEvent);
      return false;
    }

    if (this.reservations.has(orderId)) {
      throw new Error(`Reservation already exists for order ${orderId}`);
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    const event = this.createEvent('StockReserved', {
      orderId,
      quantity,
      expiresAt: expiresAt.toISOString(),
      availableStockAfter: availableStock - quantity,
    });

    this.addEvent(event);
    this.apply(event);
    return true;
  }

  confirmReservation(orderId: string): void {
    const reservation = this.reservations.get(orderId);

    if (!reservation) {
      throw new Error(`No reservation found for order ${orderId}`);
    }

    if (reservation.status !== StockReservationStatus.PENDING) {
      throw new Error(
        `Reservation for order ${orderId} is not in PENDING status`
      );
    }

    const event = this.createEvent('StockReservationConfirmed', {
      orderId,
      quantity: reservation.quantity,
      previousTotalStock: this.totalStock,
      newTotalStock: this.totalStock - reservation.quantity,
    });

    this.addEvent(event);
    this.apply(event);
  }

  releaseReservation(orderId: string, reason?: string): void {
    const reservation = this.reservations.get(orderId);

    if (!reservation) {
      throw new Error(`No reservation found for order ${orderId}`);
    }

    if (reservation.status === StockReservationStatus.RELEASED) {
      throw new Error(`Reservation for order ${orderId} is already released`);
    }

    if (reservation.status === StockReservationStatus.CONFIRMED) {
      throw new Error(
        `Cannot release confirmed reservation for order ${orderId}`
      );
    }

    const event = this.createEvent('StockReservationReleased', {
      orderId,
      quantity: reservation.quantity,
      reason: reason || 'Order cancelled',
      availableStockAfter: this.getAvailableStock() + reservation.quantity,
    });

    this.addEvent(event);
    this.apply(event);
  }

  getAvailableStock(): number {
    return this.totalStock - this.reservedStock;
  }

  getDetails() {
    return {
      id: this.id,
      productId: this.productId,
      sku: this.sku,
      productName: this.productName,
      totalStock: this.totalStock,
      reservedStock: this.reservedStock,
      availableStock: this.getAvailableStock(),
      reservations: Array.from(this.reservations.values()),
      version: this.version,
    };
  }

  getProductId(): string {
    return this.productId;
  }

  getSku(): string {
    return this.sku;
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case 'InventoryItemCreated':
        this.productId = event.data['productId'] as string;
        this.sku = event.data['sku'] as string;
        this.productName = event.data['productName'] as string;
        this.totalStock = event.data['initialStock'] as number;
        this.reservedStock = 0;
        break;

      case 'StockAdded':
        this.totalStock = event.data['newTotal'] as number;
        break;

      case 'StockReserved':
        {
          const orderId = event.data['orderId'] as string;
          const quantity = event.data['quantity'] as number;
          const expiresAt = new Date(event.data['expiresAt'] as string);

          this.reservations.set(orderId, {
            orderId,
            quantity,
            status: StockReservationStatus.PENDING,
            reservedAt: event.occurredAt,
            expiresAt,
          });
          this.reservedStock += quantity;
        }
        break;

      case 'StockReservationFailed':
        break;

      case 'StockReservationConfirmed':
        {
          const orderId = event.data['orderId'] as string;
          const reservation = this.reservations.get(orderId);

          if (reservation) {
            this.totalStock = event.data['newTotalStock'] as number;
            this.reservedStock -= reservation.quantity;
            reservation.status = StockReservationStatus.CONFIRMED;
          }
        }
        break;

      case 'StockReservationReleased':
        {
          const orderId = event.data['orderId'] as string;
          const reservation = this.reservations.get(orderId);

          if (reservation) {
            this.reservedStock -= reservation.quantity;
            reservation.status = StockReservationStatus.RELEASED;
          }
        }
        break;

      default:
        break;
    }
  }
}
