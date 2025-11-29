import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { EVENT_TYPES } from './events/event.constants';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PAYPAL = 'PAYPAL',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export interface PaymentAmount {
  value: number;
  currency: string;
}

export class Payment extends AggregateRoot {
  private orderId!: string;
  private amount!: PaymentAmount;
  private status: PaymentStatus = PaymentStatus.PENDING;
  private paymentMethod!: PaymentMethod;
  private transactionId?: string;
  private failureReason?: string;
  private refundedAmount?: PaymentAmount;
  private processedAt?: Date;

  static create(
    paymentId: string,
    orderId: string,
    amount: number,
    currency: string,
    paymentMethod: PaymentMethod
  ): Payment {
    const payment = new Payment(paymentId);

    const event = payment.createEvent(EVENT_TYPES.PAYMENT.CREATED, {
      orderId,
      amount,
      currency,
      paymentMethod,
    });

    payment.addEvent(event);
    payment.apply(event);

    return payment;
  }

  static fromEvents(events: DomainEvent[]): Payment {
    const payment = new Payment(events[0].aggregateId);
    payment.loadFromHistory(events);
    return payment;
  }

  static fromSnapshot(
    snapshotData: {
      _id: string;
      orderId: string;
      amount: PaymentAmount;
      status: PaymentStatus;
      paymentMethod: PaymentMethod;
      transactionId?: string;
      failureReason?: string;
      refundedAmount?: PaymentAmount;
      processedAt?: string;
    },
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): Payment {
    const payment = new Payment(snapshotData._id);

    payment.orderId = snapshotData.orderId;
    payment.amount = snapshotData.amount;
    payment.status = snapshotData.status;
    payment.paymentMethod = snapshotData.paymentMethod;
    payment.transactionId = snapshotData.transactionId;
    payment.failureReason = snapshotData.failureReason;
    payment.refundedAmount = snapshotData.refundedAmount;
    payment.processedAt = snapshotData.processedAt
      ? new Date(snapshotData.processedAt)
      : undefined;
    payment._version = snapshotVersion;

    if (subsequentEvents.length > 0) {
      payment.loadFromHistory(subsequentEvents);
    }

    return payment;
  }

  process(): void {
    if (this.status !== PaymentStatus.PENDING) {
      throw new Error('Can only process pending payments');
    }

    const event = this.createEvent(EVENT_TYPES.PAYMENT.PROCESSING, {});
    this.addEvent(event);
    this.apply(event);
  }

  complete(transactionId: string): void {
    if (this.status !== PaymentStatus.PROCESSING) {
      throw new Error('Can only complete processing payments');
    }

    const event = this.createEvent(EVENT_TYPES.PAYMENT.COMPLETED, {
      transactionId,
      processedAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  fail(reason: string): void {
    if (
      this.status !== PaymentStatus.PENDING &&
      this.status !== PaymentStatus.PROCESSING
    ) {
      throw new Error('Cannot fail payment in current status');
    }

    const event = this.createEvent(EVENT_TYPES.PAYMENT.FAILED, {
      reason,
      processedAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  refund(amount: number, reason: string): void {
    if (this.status !== PaymentStatus.COMPLETED) {
      throw new Error('Can only refund completed payments');
    }

    if (amount > this.amount.value) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    const event = this.createEvent(EVENT_TYPES.PAYMENT.REFUNDED, {
      amount,
      reason,
      refundedAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  getDetails() {
    return {
      id: this.id,
      orderId: this.orderId,
      amount: this.amount,
      status: this.status,
      paymentMethod: this.paymentMethod,
      transactionId: this.transactionId,
      failureReason: this.failureReason,
      refundedAmount: this.refundedAmount,
      processedAt: this.processedAt,
      version: this.version,
    };
  }

  getOrderId(): string {
    return this.orderId;
  }

  getStatus(): PaymentStatus {
    return this.status;
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case EVENT_TYPES.PAYMENT.CREATED:
        this.orderId = event.data['orderId'] as string;
        this.amount = {
          value: event.data['amount'] as number,
          currency: event.data['currency'] as string,
        };
        this.paymentMethod = event.data['paymentMethod'] as PaymentMethod;
        this.status = PaymentStatus.PENDING;
        break;

      case EVENT_TYPES.PAYMENT.PROCESSING:
        this.status = PaymentStatus.PROCESSING;
        break;

      case EVENT_TYPES.PAYMENT.COMPLETED:
        this.status = PaymentStatus.COMPLETED;
        this.transactionId = event.data['transactionId'] as string;
        this.processedAt = new Date(event.data['processedAt'] as string);
        break;

      case EVENT_TYPES.PAYMENT.FAILED:
        this.status = PaymentStatus.FAILED;
        this.failureReason = event.data['reason'] as string;
        this.processedAt = new Date(event.data['processedAt'] as string);
        break;

      case EVENT_TYPES.PAYMENT.REFUNDED:
        this.status = PaymentStatus.REFUNDED;
        this.refundedAmount = {
          value: event.data['amount'] as number,
          currency: this.amount.currency,
        };
        break;

      default:
        break;
    }
  }
}
