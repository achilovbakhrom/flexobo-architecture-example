/**
 * Order DTOs (Data Transfer Objects)
 *
 * These DTOs are used for communication between layers.
 * They decouple the domain model from infrastructure concerns.
 */

export interface OrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  priceAmount: number;
  priceCurrency: string;
}

export interface OrderDto {
  id: string;
  userId: string;
  items: OrderItemDto[];
  status: string;
  totalAmount: number;
  currency: string;
  trackingNumber?: string;
  version: number;
}

/**
 * Stored event format from the event store
 */
export interface StoredEventDto {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  version: number;
  occurredAt: Date;
  metadata?: Record<string, unknown> | null;
}

/**
 * Read model for order list queries
 */
export interface OrderReadModelDto {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  trackingNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Read model for order items
 */
export interface OrderItemReadModelDto {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  priceAmount: number;
  priceCurrency: string;
}

/**
 * Full order read model with items
 */
export interface OrderWithItemsReadModelDto extends OrderReadModelDto {
  items: OrderItemReadModelDto[];
}
