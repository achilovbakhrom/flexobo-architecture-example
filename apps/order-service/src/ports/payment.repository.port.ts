import { PaymentDto } from '../application/dto/payment.dto';

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
