/**
 * Payment DTOs
 *
 * Payment is event-sourced. These DTOs are used for:
 * - Communication between layers
 * - Read model queries
 */

export interface PaymentDto {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId?: string | null;
  failureReason?: string | null;
  refundedAmount?: number | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentDto {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

export interface ProcessPaymentDto {
  paymentId: string;
}

export interface CompletePaymentDto {
  paymentId: string;
  transactionId: string;
}

export interface FailPaymentDto {
  paymentId: string;
  reason: string;
}

export interface RefundPaymentDto {
  paymentId: string;
  amount: number;
  reason: string;
}

/**
 * Stored event format for payment events
 */
export interface PaymentStoredEventDto {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  version: number;
  occurredAt: Date;
  metadata?: Record<string, unknown> | null;
}
