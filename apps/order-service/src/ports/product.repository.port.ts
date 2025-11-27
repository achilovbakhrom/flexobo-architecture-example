import {
  ProductDto,
  ProductStoredEventDto,
} from '../application/dto/product.dto';

export interface IProductEventRepository {
  getEvents(productId: string): Promise<ProductStoredEventDto[]>;

  appendEvents(
    productId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void>;

  exists(productId: string): Promise<boolean>;
}

export const PRODUCT_EVENT_REPOSITORY = Symbol('IProductEventRepository');

export interface IProductReadModelRepository {
  findById(productId: string): Promise<ProductDto | null>;

  findBySku(sku: string): Promise<ProductDto | null>;

  findByCategory(
    category: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ProductDto[]>;

  findActive(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ProductDto[]>;

  search(
    query: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ProductDto[]>;

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

  delete(productId: string): Promise<void>;
}

export const PRODUCT_READ_MODEL_REPOSITORY = Symbol(
  'IProductReadModelRepository'
);
