import { PaymentProvider, PaymentType } from '../constants/enums';

// Payment Event Types
export enum PaymentEventType {
  Initiated = 'payment.initiated',
  Processing = 'payment.processing',
  Succeeded = 'payment.succeeded',
  Failed = 'payment.failed',
  Refunded = 'payment.refunded',
}

// Payment Method Info
export type PaymentMethodInfo = {
  type: string;
  last4?: string;
  brand?: string;
};

// Payment Event Data Types (use type for Record<string, unknown> compatibility)
export type PaymentInitiatedEventData = {
  paymentId: string;
  subscriptionId: string;
  companyId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  paymentType: PaymentType;
};

export type PaymentProcessingEventData = {
  paymentId: string;
  externalId: string;
};

export type PaymentSucceededEventData = {
  paymentId: string;
  externalId: string;
  paymentMethod?: PaymentMethodInfo;
};

export type PaymentFailedEventData = {
  paymentId: string;
  failureReason: string;
  retryCount: number;
};

export type PaymentRefundedEventData = {
  paymentId: string;
  refundAmount: number;
  reason?: string;
};

// Event types for type discrimination
export type PaymentInitiatedEvent = {
  type: PaymentEventType.Initiated;
  data: PaymentInitiatedEventData;
};

export type PaymentProcessingEvent = {
  type: PaymentEventType.Processing;
  data: PaymentProcessingEventData;
};

export type PaymentSucceededEvent = {
  type: PaymentEventType.Succeeded;
  data: PaymentSucceededEventData;
};

export type PaymentFailedEvent = {
  type: PaymentEventType.Failed;
  data: PaymentFailedEventData;
};

export type PaymentRefundedEvent = {
  type: PaymentEventType.Refunded;
  data: PaymentRefundedEventData;
};

// Union type of all payment events
export type PaymentEvent =
  | PaymentInitiatedEvent
  | PaymentProcessingEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent;
