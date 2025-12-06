import { PaymentProvider, PaymentStatus, PaymentType } from '../domain/constants/enums';
import { PaymentMethodInfo } from '../domain/events/payment.events';

export const PAYMENT_AGGREGATE_STORE = Symbol('PAYMENT_AGGREGATE_STORE');
export const PAYMENT_READ_REPOSITORY = Symbol('PAYMENT_READ_REPOSITORY');

export interface PaymentReadData {
  id: string;
  subscriptionId: string;
  companyId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  paymentType: PaymentType;
  externalId?: string;
  paymentMethod?: PaymentMethodInfo;
  failureReason?: string;
  retryCount: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentReadRepository {
  findById(id: string): Promise<PaymentReadData | null>;
  findByExternalId(provider: PaymentProvider, externalId: string): Promise<PaymentReadData | null>;
  findBySubscriptionId(subscriptionId: string): Promise<PaymentReadData[]>;
  findByCompanyId(companyId: string, limit?: number): Promise<PaymentReadData[]>;
  findPending(): Promise<PaymentReadData[]>;
  save(payment: PaymentReadData): Promise<void>;
  update(id: string, data: Partial<PaymentReadData>): Promise<void>;
}
