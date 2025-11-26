/**
 * Product Aggregate (Event-Sourced)
 *
 * Represents a product in the catalog. Follows event sourcing pattern
 * where all state changes are captured as domain events.
 */

import { AggregateRoot, DomainEvent } from '@flexobo/core';

// ============================================================
// Value Objects
// ============================================================

export interface ProductPrice {
  amount: number;
  currency: string;
}

// ============================================================
// Product Aggregate
// ============================================================

export class Product extends AggregateRoot {
  private sku!: string;
  private name!: string;
  private description?: string;
  private category?: string;
  private price!: ProductPrice;
  private stockLevel!: number;
  private isActive!: boolean;
  private imageUrl?: string;
  private metadata?: Record<string, unknown>;

  /**
   * Create a new product
   */
  static create(
    productId: string,
    sku: string,
    name: string,
    priceAmount: number,
    currency: string,
    options?: {
      description?: string;
      category?: string;
      stockLevel?: number;
      imageUrl?: string;
      metadata?: Record<string, unknown>;
    }
  ): Product {
    const product = new Product(productId);

    const event = product.createEvent('ProductCreated', {
      sku,
      name,
      description: options?.description,
      category: options?.category,
      priceAmount,
      currency,
      stockLevel: options?.stockLevel ?? 0,
      imageUrl: options?.imageUrl,
      metadata: options?.metadata,
    });

    product.addEvent(event);
    product.apply(event);

    return product;
  }

  /**
   * Reconstruct product from events
   */
  static fromEvents(events: DomainEvent[]): Product {
    const product = new Product(events[0].aggregateId);
    product.loadFromHistory(events);
    return product;
  }

  /**
   * Update product details
   */
  update(data: {
    name?: string;
    description?: string;
    category?: string;
    priceAmount?: number;
    currency?: string;
    imageUrl?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const event = this.createEvent('ProductUpdated', {
      name: data.name,
      description: data.description,
      category: data.category,
      priceAmount: data.priceAmount,
      currency: data.currency,
      imageUrl: data.imageUrl,
      metadata: data.metadata,
    });

    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Update stock level
   */
  updateStock(quantity: number, reason?: string): void {
    if (quantity < 0) {
      throw new Error('Stock level cannot be negative');
    }

    const previousLevel = this.stockLevel;
    const event = this.createEvent('ProductStockUpdated', {
      previousLevel,
      newLevel: quantity,
      difference: quantity - previousLevel,
      reason,
    });

    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Activate the product
   */
  activate(): void {
    if (this.isActive) {
      return; // Already active
    }

    const event = this.createEvent('ProductActivated', {});
    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Deactivate the product
   */
  deactivate(): void {
    if (!this.isActive) {
      return; // Already inactive
    }

    const event = this.createEvent('ProductDeactivated', {});
    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Delete the product (soft delete via deactivation)
   */
  delete(): void {
    const event = this.createEvent('ProductDeleted', {});
    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Get product details
   */
  getDetails() {
    return {
      id: this.id,
      sku: this.sku,
      name: this.name,
      description: this.description,
      category: this.category,
      price: this.price,
      stockLevel: this.stockLevel,
      isActive: this.isActive,
      imageUrl: this.imageUrl,
      metadata: this.metadata,
      version: this.version,
    };
  }

  // Getters
  getSku(): string {
    return this.sku;
  }

  getName(): string {
    return this.name;
  }

  getStockLevel(): number {
    return this.stockLevel;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  // ============================================================
  // Event Application Logic
  // ============================================================

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case 'ProductCreated':
        this.sku = event.data['sku'] as string;
        this.name = event.data['name'] as string;
        this.description = event.data['description'] as string | undefined;
        this.category = event.data['category'] as string | undefined;
        this.price = {
          amount: event.data['priceAmount'] as number,
          currency: event.data['currency'] as string,
        };
        this.stockLevel = event.data['stockLevel'] as number;
        this.isActive = true;
        this.imageUrl = event.data['imageUrl'] as string | undefined;
        this.metadata = event.data['metadata'] as
          | Record<string, unknown>
          | undefined;
        break;

      case 'ProductUpdated':
        if (event.data['name'] !== undefined) {
          this.name = event.data['name'] as string;
        }
        if (event.data['description'] !== undefined) {
          this.description = event.data['description'] as string;
        }
        if (event.data['category'] !== undefined) {
          this.category = event.data['category'] as string;
        }
        if (
          event.data['priceAmount'] !== undefined ||
          event.data['currency'] !== undefined
        ) {
          this.price = {
            amount:
              (event.data['priceAmount'] as number) ?? this.price.amount,
            currency: (event.data['currency'] as string) ?? this.price.currency,
          };
        }
        if (event.data['imageUrl'] !== undefined) {
          this.imageUrl = event.data['imageUrl'] as string;
        }
        if (event.data['metadata'] !== undefined) {
          this.metadata = event.data['metadata'] as Record<string, unknown>;
        }
        break;

      case 'ProductStockUpdated':
        this.stockLevel = event.data['newLevel'] as number;
        break;

      case 'ProductActivated':
        this.isActive = true;
        break;

      case 'ProductDeactivated':
        this.isActive = false;
        break;

      case 'ProductDeleted':
        this.isActive = false;
        break;

      default:
        // Ignore unknown events
        break;
    }
  }
}
