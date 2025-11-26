/**
 * Product Repository Ports
 *
 * Product is now event-sourced. We have two ports:
 * 1. IProductEventRepository - for event sourcing (write side)
 * 2. IProductReadModelRepository - for queries (read side)
 */

import { ProductDto, ProductStoredEventDto } from '../application/dto/product.dto';

// ============================================================
// Event Repository Port (Write Side)
// ============================================================

export interface IProductEventRepository {
  /**
   * Get all events for a product
   */
  getEvents(productId: string): Promise<ProductStoredEventDto[]>;

  /**
   * Append new events to the product stream
   */
  appendEvents(
    productId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void>;

  /**
   * Check if product exists
   */
  exists(productId: string): Promise<boolean>;
}

export const PRODUCT_EVENT_REPOSITORY = Symbol('IProductEventRepository');

// ============================================================
// Read Model Repository Port (Query Side)
// ============================================================

export interface IProductReadModelRepository {
  /**
   * Find product by ID
   */
  findById(productId: string): Promise<ProductDto | null>;

  /**
   * Find product by SKU
   */
  findBySku(sku: string): Promise<ProductDto | null>;

  /**
   * Find products by category
   */
  findByCategory(
    category: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ProductDto[]>;

  /**
   * Find all active products
   */
  findActive(options?: { limit?: number; offset?: number }): Promise<ProductDto[]>;

  /**
   * Search products by name
   */
  search(
    query: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ProductDto[]>;

  /**
   * Upsert (create or update) product in read model
   */
  upsert(product: {
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
    updatedAt: Date;
  }): Promise<void>;

  /**
   * Delete product from read model
   */
  delete(productId: string): Promise<void>;
}

export const PRODUCT_READ_MODEL_REPOSITORY = Symbol('IProductReadModelRepository');
