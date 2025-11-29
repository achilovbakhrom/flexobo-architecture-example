/**
 * Product DTOs
 *
 * Product is event-sourced with separate read model for queries.
 */

export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  priceAmount: number;
  currency: string;
  stockLevel: number;
  isActive: boolean;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  priceAmount: number;
  currency?: string;
  stockLevel?: number;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  category?: string;
  priceAmount?: number;
  currency?: string;
  stockLevel?: number;
  isActive?: boolean;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Stored event DTO for product event sourcing
 */
export interface ProductStoredEventDto {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  version: number;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}
