import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { EVENT_TYPES } from './events/event.constants';

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
  AWAITING_INVENTORY = 'AWAITING_INVENTORY',
  INVENTORY_RESERVED = 'INVENTORY_RESERVED',
  INVENTORY_FAILED = 'INVENTORY_FAILED',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class Order extends AggregateRoot {
  private userId!: string;
  private items: OrderItem[] = [];
  private status: OrderStatus = OrderStatus.DRAFT;
  private totalAmount = 0;
  private currency = 'USD';
  private trackingNumber?: string;
  private paymentId?: string;
  private failedPaymentCount = 0;

  static readonly MAX_PAYMENT_FAILURES = 3;

  static create(orderId: string, userId: string): Order {
    const order = new Order(orderId);

    const event = order.createEvent(EVENT_TYPES.ORDER.CREATED, {
      userId,
      items: [],
      totalAmount: 0,
      currency: 'USD',
    });

    order.addEvent(event);
    order.apply(event);

    return order;
  }

  static fromEvents(events: DomainEvent[]): Order {
    const order = new Order(events[0].aggregateId);
    order.loadFromHistory(events);
    return order;
  }

  /**
   * Restore an Order from a snapshot and subsequent events
   * @param snapshotData The snapshot data containing aggregate state
   * @param snapshotVersion The version at which the snapshot was taken
   * @param subsequentEvents Events that occurred after the snapshot
   */
  static fromSnapshot(
    snapshotData: {
      _id: string;
      userId: string;
      items: OrderItem[];
      status: OrderStatus;
      totalAmount: number;
      currency: string;
      trackingNumber?: string;
      paymentId?: string;
      failedPaymentCount?: number;
    },
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): Order {
    const order = new Order(snapshotData._id);

    // Restore state from snapshot
    order.userId = snapshotData.userId;
    order.items = snapshotData.items || [];
    order.status = snapshotData.status;
    order.totalAmount = snapshotData.totalAmount;
    order.currency = snapshotData.currency;
    order.trackingNumber = snapshotData.trackingNumber;
    order.paymentId = snapshotData.paymentId;
    order.failedPaymentCount = snapshotData.failedPaymentCount ?? 0;
    order._version = snapshotVersion;

    // Apply any events that occurred after the snapshot
    if (subsequentEvents.length > 0) {
      order.loadFromHistory(subsequentEvents);
    }

    return order;
  }

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

    const event = this.createEvent(EVENT_TYPES.ORDER.ITEM_ADDED, { item });
    this.addEvent(event);
    this.apply(event);
  }

  confirm(): void {
    if (this.status !== OrderStatus.DRAFT) {
      throw new Error('Can only confirm draft orders');
    }

    if (this.items.length === 0) {
      throw new Error('Cannot confirm order with no items');
    }

    const event = this.createEvent(EVENT_TYPES.ORDER.CONFIRMED, {
      items: this.items,
      userId: this.userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  markInventoryReserved(
    reservations: Array<{ productId: string; quantity: number }>
  ): void {
    if (this.status !== OrderStatus.AWAITING_INVENTORY) {
      throw new Error(
        'Can only reserve inventory for orders awaiting inventory'
      );
    }

    const event = this.createEvent(EVENT_TYPES.ORDER.INVENTORY_RESERVED, {
      reservations,
      reservedAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  markInventoryFailed(failedProductIds: string[], reason: string): void {
    if (this.status !== OrderStatus.AWAITING_INVENTORY) {
      throw new Error('Can only fail inventory for orders awaiting inventory');
    }

    const event = this.createEvent(EVENT_TYPES.ORDER.INVENTORY_FAILED, {
      failedProductIds,
      reason,
      failedAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);
  }

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

    const event = this.createEvent(EVENT_TYPES.ORDER.CANCELLED, {
      reason,
      paymentId: this.paymentId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  markPaid(paymentId: string, transactionId: string): void {
    if (this.status !== OrderStatus.INVENTORY_RESERVED) {
      throw new Error('Can only mark as paid orders with reserved inventory');
    }

    const event = this.createEvent(EVENT_TYPES.ORDER.PAID, {
      paymentId,
      transactionId,
      paidAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  ship(trackingNumber: string): void {
    if (this.status !== OrderStatus.PAID) {
      throw new Error('Can only ship paid orders');
    }

    const event = this.createEvent(EVENT_TYPES.ORDER.SHIPPED, { trackingNumber });
    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Record a failed payment attempt. Auto-cancels after MAX_PAYMENT_FAILURES.
   * Returns true if order was auto-cancelled.
   */
  recordPaymentFailed(paymentId: string, reason: string): boolean {
    if (this.status !== OrderStatus.INVENTORY_RESERVED) {
      throw new Error('Can only record payment failure for orders with reserved inventory');
    }

    const newCount = this.failedPaymentCount + 1;
    const shouldCancel = newCount >= Order.MAX_PAYMENT_FAILURES;

    const event = this.createEvent(EVENT_TYPES.ORDER.PAYMENT_FAILED, {
      paymentId,
      reason,
      failureCount: newCount,
      maxFailures: Order.MAX_PAYMENT_FAILURES,
      autoCancelled: shouldCancel,
      failedAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);

    // Auto-cancel if max failures reached
    if (shouldCancel) {
      this.cancel(`Payment failed ${Order.MAX_PAYMENT_FAILURES} times: ${reason}`);
    }

    return shouldCancel;
  }

  getDetails() {
    return {
      id: this.id,
      userId: this.userId,
      items: this.items,
      status: this.status,
      totalAmount: this.totalAmount,
      currency: this.currency,
      trackingNumber: this.trackingNumber,
      paymentId: this.paymentId,
      failedPaymentCount: this.failedPaymentCount,
      version: this.version,
    };
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case EVENT_TYPES.ORDER.CREATED:
        this.userId = event.data['userId'] as string;
        this.items = event.data['items'] as OrderItem[];
        this.totalAmount = event.data['totalAmount'] as number;
        this.currency = event.data['currency'] as string;
        this.status = OrderStatus.DRAFT;
        break;

      case EVENT_TYPES.ORDER.ITEM_ADDED:
        {
          const item = event.data['item'] as OrderItem;
          this.items.push(item);

          this.totalAmount = this.items.reduce(
            (sum, i) => sum + i.priceAmount * i.quantity,
            0
          );
        }
        break;

      case EVENT_TYPES.ORDER.CONFIRMED:
        this.status = OrderStatus.AWAITING_INVENTORY;
        break;

      case EVENT_TYPES.ORDER.INVENTORY_RESERVED:
        this.status = OrderStatus.INVENTORY_RESERVED;
        break;

      case EVENT_TYPES.ORDER.INVENTORY_FAILED:
        this.status = OrderStatus.INVENTORY_FAILED;
        break;

      case EVENT_TYPES.ORDER.PAID:
        this.status = OrderStatus.PAID;
        this.paymentId = event.data['paymentId'] as string;
        break;

      case EVENT_TYPES.ORDER.PAYMENT_FAILED:
        this.failedPaymentCount = event.data['failureCount'] as number;
        break;

      case EVENT_TYPES.ORDER.CANCELLED:
        this.status = OrderStatus.CANCELLED;
        break;

      case EVENT_TYPES.ORDER.SHIPPED:
        this.status = OrderStatus.SHIPPED;
        this.trackingNumber = event.data['trackingNumber'] as string;
        break;

      default:
        break;
    }
  }
}
