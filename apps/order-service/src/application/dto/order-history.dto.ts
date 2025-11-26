/**
 * Order History DTOs
 *
 * Order History is a read-only projection (audit log).
 * It captures all changes to orders for auditing purposes.
 */

export interface OrderHistoryDto {
  id: string;
  orderId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  previousState?: string | null;
  newState?: string | null;
  changedBy?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  occurredAt: Date;
}

export interface CreateOrderHistoryEntryDto {
  orderId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  previousState?: string;
  newState?: string;
  changedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface OrderHistoryQueryDto {
  orderId?: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
