/**
 * Payment Repository Ports
 *
 * Payment is event-sourced, so we have two ports:
 * 1. Event repository - for write side (event store)
 * 2. Read model repository - for query side (CQRS)
 */

import { PaymentDto, PaymentStoredEventDto } from '../application/dto/payment.dto';

// ============================================================
// Event Repository Port (Write Side)
// ============================================================

export interface IPaymentEventRepository {
  /**
   * Get all events for a payment aggregate
   */
  getEvents(paymentId: string): Promise<PaymentStoredEventDto[]>;

  /**
   * Append events to the event store
   */
  appendEvents(
    paymentId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void>;

  /**
   * Check if a payment exists (has any events)
   */
  exists(paymentId: string): Promise<boolean>;
}

export const PAYMENT_EVENT_REPOSITORY = Symbol('IPaymentEventRepository');

// ============================================================
// Read Model Repository Port (Query Side)
// ============================================================

export interface IPaymentReadModelRepository {
  /**
   * Find payment by ID
   */
  findById(paymentId: string): Promise<PaymentDto | null>;

  /**
   * Find payments by order ID
   */
  findByOrderId(orderId: string): Promise<PaymentDto[]>;

  /**
   * Find payments by status
   */
  findByStatus(
    status: string,
    options?: { limit?: number; offset?: number }
  ): Promise<PaymentDto[]>;

  /**
   * Find payment by transaction ID
   */
  findByTransactionId(transactionId: string): Promise<PaymentDto | null>;

  /**
   * Upsert payment read model (used by projections)
   */
  upsert(payment: Omit<PaymentDto, 'createdAt'>): Promise<void>;

  /**
   * Delete payment read model
   */
  delete(paymentId: string): Promise<void>;
}

export const PAYMENT_READ_MODEL_REPOSITORY = Symbol('IPaymentReadModelRepository');
