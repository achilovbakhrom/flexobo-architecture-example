import { v4 as uuid } from 'uuid';
import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { PaymentProvider, PaymentStatus, PaymentType } from '../constants/enums';
import {
  PaymentEventType,
  PaymentInitiatedEventData,
  PaymentProcessingEventData,
  PaymentSucceededEventData,
  PaymentFailedEventData,
  PaymentRefundedEventData,
  PaymentMethodInfo,
} from '../events/payment.events';
import { Money } from '../value-objects/money.vo';

export interface PaymentState {
  id: string;
  subscriptionId: string;
  companyId: string;
  amount: Money;
  status: PaymentStatus;
  provider: PaymentProvider;
  paymentType: PaymentType;
  externalId?: string;
  paymentMethod?: PaymentMethodInfo;
  failureReason?: string;
  retryCount: number;
}

export interface InitiatePaymentData {
  id?: string;
  subscriptionId: string;
  companyId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  paymentType: PaymentType;
  externalId?: string;
}

export class PaymentAggregate extends AggregateRoot {
  private state!: PaymentState;

  get paymentId(): string {
    return this.state.id;
  }

  get subscriptionId(): string {
    return this.state.subscriptionId;
  }

  get companyId(): string {
    return this.state.companyId;
  }

  get amount(): Money {
    return this.state.amount;
  }

  get status(): PaymentStatus {
    return this.state.status;
  }

  get provider(): PaymentProvider {
    return this.state.provider;
  }

  get paymentType(): PaymentType {
    return this.state.paymentType;
  }

  get externalId(): string | undefined {
    return this.state.externalId;
  }

  get paymentMethod(): PaymentMethodInfo | undefined {
    return this.state.paymentMethod;
  }

  get failureReason(): string | undefined {
    return this.state.failureReason;
  }

  get retryCount(): number {
    return this.state.retryCount;
  }

  static initiate(data: InitiatePaymentData): PaymentAggregate {
    const id = data.id ?? uuid();
    const aggregate = new PaymentAggregate(id);

    const eventData: PaymentInitiatedEventData = {
      paymentId: id,
      subscriptionId: data.subscriptionId,
      companyId: data.companyId,
      amount: data.amount,
      currency: data.currency,
      provider: data.provider,
      paymentType: data.paymentType,
    };

    const event = aggregate.createEvent(PaymentEventType.Initiated, eventData);
    aggregate.addEvent(event);
    aggregate.apply(event);

    return aggregate;
  }

  static fromEvents(events: DomainEvent[]): PaymentAggregate {
    if (events.length === 0) {
      throw new Error('Cannot create PaymentAggregate from empty events');
    }
    const aggregate = new PaymentAggregate(events[0].aggregateId);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  process(externalId: string): void {
    if (this.state.status !== PaymentStatus.PENDING) {
      throw new Error(
        `Cannot process payment in ${this.state.status} status`,
      );
    }

    const eventData: PaymentProcessingEventData = {
      paymentId: this.id,
      externalId,
    };

    const event = this.createEvent(PaymentEventType.Processing, eventData);
    this.addEvent(event);
    this.apply(event);
  }

  succeed(externalId: string, paymentMethod?: PaymentMethodInfo): void {
    if (
      this.state.status !== PaymentStatus.PENDING &&
      this.state.status !== PaymentStatus.PROCESSING
    ) {
      throw new Error(
        `Cannot succeed payment in ${this.state.status} status`,
      );
    }

    const eventData: PaymentSucceededEventData = {
      paymentId: this.id,
      externalId,
      paymentMethod,
    };

    const event = this.createEvent(PaymentEventType.Succeeded, eventData);
    this.addEvent(event);
    this.apply(event);
  }

  fail(failureReason: string): void {
    if (
      this.state.status !== PaymentStatus.PENDING &&
      this.state.status !== PaymentStatus.PROCESSING
    ) {
      throw new Error(
        `Cannot fail payment in ${this.state.status} status`,
      );
    }

    const eventData: PaymentFailedEventData = {
      paymentId: this.id,
      failureReason,
      retryCount: this.state.retryCount + 1,
    };

    const event = this.createEvent(PaymentEventType.Failed, eventData);
    this.addEvent(event);
    this.apply(event);
  }

  refund(refundAmount?: number, reason?: string): void {
    if (this.state.status !== PaymentStatus.SUCCEEDED) {
      throw new Error(
        `Cannot refund payment in ${this.state.status} status`,
      );
    }

    const amount = refundAmount ?? this.state.amount.amount;
    if (amount > this.state.amount.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    const eventData: PaymentRefundedEventData = {
      paymentId: this.id,
      refundAmount: amount,
      reason,
    };

    const event = this.createEvent(PaymentEventType.Refunded, eventData);
    this.addEvent(event);
    this.apply(event);
  }

  canRetry(): boolean {
    return (
      this.state.status === PaymentStatus.FAILED && this.state.retryCount < 3
    );
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case PaymentEventType.Initiated:
        this.applyPaymentInitiated(event.data as PaymentInitiatedEventData);
        break;
      case PaymentEventType.Processing:
        this.applyPaymentProcessing(event.data as PaymentProcessingEventData);
        break;
      case PaymentEventType.Succeeded:
        this.applyPaymentSucceeded(event.data as PaymentSucceededEventData);
        break;
      case PaymentEventType.Failed:
        this.applyPaymentFailed(event.data as PaymentFailedEventData);
        break;
      case PaymentEventType.Refunded:
        this.applyPaymentRefunded();
        break;
    }
  }

  private applyPaymentInitiated(data: PaymentInitiatedEventData): void {
    this.state = {
      id: data.paymentId,
      subscriptionId: data.subscriptionId,
      companyId: data.companyId,
      amount: Money.create(data.amount, data.currency),
      status: PaymentStatus.PENDING,
      provider: data.provider,
      paymentType: data.paymentType,
      retryCount: 0,
    };
  }

  private applyPaymentProcessing(data: PaymentProcessingEventData): void {
    this.state.status = PaymentStatus.PROCESSING;
    this.state.externalId = data.externalId;
  }

  private applyPaymentSucceeded(data: PaymentSucceededEventData): void {
    this.state.status = PaymentStatus.SUCCEEDED;
    this.state.externalId = data.externalId;
    this.state.paymentMethod = data.paymentMethod;
  }

  private applyPaymentFailed(data: PaymentFailedEventData): void {
    this.state.status = PaymentStatus.FAILED;
    this.state.failureReason = data.failureReason;
    this.state.retryCount = data.retryCount;
  }

  private applyPaymentRefunded(): void {
    this.state.status = PaymentStatus.REFUNDED;
  }

  toJSON(): PaymentState & { version: number } {
    return {
      ...this.state,
      version: this.version,
    };
  }
}
