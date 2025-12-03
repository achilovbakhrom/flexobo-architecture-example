import {
  BillingCycle,
  PaymentProvider,
  SubscriptionStatus,
  UsageType,
} from '../constants/enums';

// Subscription Event Types
export enum SubscriptionEventType {
  Created = 'subscription.created',
  Activated = 'subscription.activated',
  PlanChanged = 'subscription.plan_changed',
  UsageRecorded = 'subscription.usage_recorded',
  CancellationScheduled = 'subscription.cancellation_scheduled',
  Cancelled = 'subscription.cancelled',
  Renewed = 'subscription.renewed',
  PastDue = 'subscription.past_due',
  Expired = 'subscription.expired',
  UsageLimitReached = 'subscription.usage_limit_reached',
}

// Subscription Event Data Types
export type SubscriptionCreatedEventData = {
  subscriptionId: string;
  companyId: string;
  planId: string;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  status: SubscriptionStatus;
};

export type SubscriptionActivatedEventData = {
  subscriptionId: string;
  companyId: string;
  paymentProvider: PaymentProvider;
  externalId: string;
};

export type SubscriptionPlanChangedEventData = {
  subscriptionId: string;
  companyId: string;
  oldPlanId: string;
  newPlanId: string;
  effectiveDate: string;
  proratedAmount?: number;
};

export type UsageRecordedEventData = {
  subscriptionId: string;
  companyId: string;
  usageType: UsageType;
  quantity: number;
  entityType?: string;
  entityId?: string;
};

export type SubscriptionCancellationScheduledEventData = {
  subscriptionId: string;
  companyId: string;
  cancelAtPeriodEnd: boolean;
  reason?: string;
};

export type SubscriptionCancelledEventData = {
  subscriptionId: string;
  companyId: string;
  reason?: string;
  cancelledAt: string;
};

export type SubscriptionRenewedEventData = {
  subscriptionId: string;
  companyId: string;
  newPeriodStart: string;
  newPeriodEnd: string;
};

export type SubscriptionPastDueEventData = {
  subscriptionId: string;
  companyId: string;
  failedPaymentId?: string;
};

export type SubscriptionExpiredEventData = {
  subscriptionId: string;
  companyId: string;
  expiredAt: string;
};

export type UsageLimitReachedEventData = {
  subscriptionId: string;
  companyId: string;
  usageType: UsageType;
  currentUsage: number;
  limit: number;
};

// Event interfaces for type discrimination
export interface SubscriptionCreatedEvent {
  type: SubscriptionEventType.Created;
  data: SubscriptionCreatedEventData;
}

export interface SubscriptionActivatedEvent {
  type: SubscriptionEventType.Activated;
  data: SubscriptionActivatedEventData;
}

export interface SubscriptionPlanChangedEvent {
  type: SubscriptionEventType.PlanChanged;
  data: SubscriptionPlanChangedEventData;
}

export interface UsageRecordedEvent {
  type: SubscriptionEventType.UsageRecorded;
  data: UsageRecordedEventData;
}

export interface SubscriptionCancellationScheduledEvent {
  type: SubscriptionEventType.CancellationScheduled;
  data: SubscriptionCancellationScheduledEventData;
}

export interface SubscriptionCancelledEvent {
  type: SubscriptionEventType.Cancelled;
  data: SubscriptionCancelledEventData;
}

export interface SubscriptionRenewedEvent {
  type: SubscriptionEventType.Renewed;
  data: SubscriptionRenewedEventData;
}

export interface SubscriptionPastDueEvent {
  type: SubscriptionEventType.PastDue;
  data: SubscriptionPastDueEventData;
}

export interface SubscriptionExpiredEvent {
  type: SubscriptionEventType.Expired;
  data: SubscriptionExpiredEventData;
}

export interface UsageLimitReachedEvent {
  type: SubscriptionEventType.UsageLimitReached;
  data: UsageLimitReachedEventData;
}

// Union type of all subscription events
export type SubscriptionEvent =
  | SubscriptionCreatedEvent
  | SubscriptionActivatedEvent
  | SubscriptionPlanChangedEvent
  | UsageRecordedEvent
  | SubscriptionCancellationScheduledEvent
  | SubscriptionCancelledEvent
  | SubscriptionRenewedEvent
  | SubscriptionPastDueEvent
  | SubscriptionExpiredEvent
  | UsageLimitReachedEvent;
