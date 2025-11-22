/**
 * Order domain model using core library
 */

import { AggregateRoot, DomainEvent } from '@flexobo/core';

// ============================================================
// Value Objects
// ============================================================

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAmount: number;
  priceCurrency: string;
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// ============================================================
// Order Aggregate
// ============================================================

export class Order extends AggregateRoot {
  private userId!: string;
  private items: OrderItem[] = [];
  private status: OrderStatus = OrderStatus.DRAFT;
  private totalAmount = 0;
  private currency = 'USD';
  private trackingNumber?: string;

  /**
   * Create new order
   */
  static create(orderId: string, userId: string): Order {
    const order = new Order(orderId);

    const event = order.createEvent('OrderCreated', {
      userId,
      items: [],
      totalAmount: 0,
      currency: 'USD',
    });

    order.addEvent(event);
    order.apply(event);

    return order;
  }

  /**
   * Reconstruct order from events
   */
  static fromEvents(events: DomainEvent[]): Order {
    const order = new Order(events[0].aggregateId);
    order.loadFromHistory(events);
    return order;
  }

  /**
   * Add item to order
   */
  addItem(
    productId: string,
    productName: string,
    quantity: number,
    priceAmount: number,
    priceCurrency: string
  ): void {
    if (this.status !== OrderStatus.DRAFT) {
      throw new Error('Cannot add items to non-draft order');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    const item: OrderItem = {
      productId,
      productName,
      quantity,
      priceAmount,
      priceCurrency,
    };

    const event = this.createEvent('OrderItemAdded', { item });
    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Confirm order
   */
  confirm(): void {
    if (this.status !== OrderStatus.DRAFT) {
      throw new Error('Can only confirm draft orders');
    }

    if (this.items.length === 0) {
      throw new Error('Cannot confirm order with no items');
    }

    const event = this.createEvent('OrderConfirmed', {});
    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Cancel order
   */
  cancel(reason: string): void {
    if (this.status === OrderStatus.CANCELLED) {
      throw new Error('Order is already cancelled');
    }

    if (
      this.status === OrderStatus.SHIPPED ||
      this.status === OrderStatus.DELIVERED
    ) {
      throw new Error('Cannot cancel shipped or delivered order');
    }

    const event = this.createEvent('OrderCancelled', { reason });
    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Ship order
   */
  ship(trackingNumber: string): void {
    if (this.status !== OrderStatus.PAID) {
      throw new Error('Can only ship paid orders');
    }

    const event = this.createEvent('OrderShipped', { trackingNumber });
    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Get order details
   */
  getDetails() {
    return {
      id: this.id,
      userId: this.userId,
      items: this.items,
      status: this.status,
      totalAmount: this.totalAmount,
      currency: this.currency,
      trackingNumber: this.trackingNumber,
      version: this.version,
    };
  }

  // ============================================================
  // Event Application Logic
  // ============================================================

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case 'OrderCreated':
        this.userId = event.data['userId'] as string;
        this.items = event.data['items'] as OrderItem[];
        this.totalAmount = event.data['totalAmount'] as number;
        this.currency = event.data['currency'] as string;
        this.status = OrderStatus.DRAFT;
        break;

      case 'OrderItemAdded':
        {
          const item = event.data['item'] as OrderItem;
          this.items.push(item);

          // Recalculate total
          this.totalAmount = this.items.reduce(
            (sum, i) => sum + i.priceAmount * i.quantity,
            0
          );
        }
        break;

      case 'OrderConfirmed':
        this.status = OrderStatus.CONFIRMED;
        break;

      case 'OrderCancelled':
        this.status = OrderStatus.CANCELLED;
        break;

      case 'OrderShipped':
        this.status = OrderStatus.SHIPPED;
        this.trackingNumber = event.data['trackingNumber'] as string;
        break;

      default:
        // Ignore unknown events
        break;
    }
  }
}
