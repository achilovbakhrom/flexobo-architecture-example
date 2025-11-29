import { DomainEvent } from '@flexobo/core';
import { Payment } from '../domain/payment.aggregate';

export interface IPaymentAggregateStore {
  load(paymentId: string): Promise<Payment | null>;

  exists(paymentId: string): Promise<boolean>;

  save(payment: Payment): Promise<DomainEvent[]>;
}

export const PAYMENT_AGGREGATE_STORE = Symbol('IPaymentAggregateStore');
