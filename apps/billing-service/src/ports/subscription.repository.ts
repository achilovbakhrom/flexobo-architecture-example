import { BillingCycle, PaymentProvider, SubscriptionStatus, UsageType } from '../domain/constants/enums';

export const SUBSCRIPTION_AGGREGATE_STORE = Symbol('SUBSCRIPTION_AGGREGATE_STORE');
export const SUBSCRIPTION_READ_REPOSITORY = Symbol('SUBSCRIPTION_READ_REPOSITORY');

export interface UsageData {
  [key: string]: number;
}

export interface SubscriptionReadData {
  id: string;
  companyId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  paymentProvider?: PaymentProvider;
  externalId?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  cancellationReason?: string;
  usageData: UsageData;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriptionReadRepository {
  findById(id: string): Promise<SubscriptionReadData | null>;
  findByCompanyId(companyId: string): Promise<SubscriptionReadData | null>;
  findByExternalId(provider: PaymentProvider, externalId: string): Promise<SubscriptionReadData | null>;
  findExpiring(beforeDate: Date): Promise<SubscriptionReadData[]>;
  findByStatus(status: SubscriptionStatus): Promise<SubscriptionReadData[]>;
  save(subscription: SubscriptionReadData): Promise<void>;
  update(id: string, data: Partial<SubscriptionReadData>): Promise<void>;
  incrementUsage(id: string, usageType: UsageType, quantity: number): Promise<void>;
  resetUsage(id: string): Promise<void>;
}
