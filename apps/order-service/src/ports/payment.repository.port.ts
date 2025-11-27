import { PaymentDto, PaymentStoredEventDto } from '../application/dto/payment.dto';

export interface IPaymentEventRepository {
  getEvents(paymentId: string): Promise<PaymentStoredEventDto[]>;

  appendEvents(
    paymentId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void>;

  exists(paymentId: string): Promise<boolean>;
}

export const PAYMENT_EVENT_REPOSITORY = Symbol('IPaymentEventRepository');

export interface IPaymentReadModelRepository {
  findById(paymentId: string): Promise<PaymentDto | null>;

  findByOrderId(orderId: string): Promise<PaymentDto[]>;

  findByStatus(
    status: string,
    options?: { limit?: number; offset?: number }
  ): Promise<PaymentDto[]>;

  findByTransactionId(transactionId: string): Promise<PaymentDto | null>;

  upsert(payment: Omit<PaymentDto, 'createdAt'>): Promise<void>;

  delete(paymentId: string): Promise<void>;
}

export const PAYMENT_READ_MODEL_REPOSITORY = Symbol('IPaymentReadModelRepository');
