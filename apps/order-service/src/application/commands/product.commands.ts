/**
 * Product commands
 *
 * Product is simple CRUD (not event-sourced).
 */

import { ICommand } from '@flexobo/core';

export class CreateProductCommand implements ICommand {
  public readonly productId: string;
  public readonly sku: string;
  public readonly name: string;
  public readonly description?: string;
  public readonly category?: string;
  public readonly priceAmount: number;
  public readonly currency?: string;
  public readonly stockLevel?: number;
  public readonly imageUrl?: string;

  constructor(...args: unknown[]) {
    const data = args[0] as {
      productId: string;
      sku: string;
      name: string;
      description?: string;
      category?: string;
      priceAmount: number;
      currency?: string;
      stockLevel?: number;
      imageUrl?: string;
    };
    this.productId = data.productId;
    this.sku = data.sku;
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.priceAmount = data.priceAmount;
    this.currency = data.currency;
    this.stockLevel = data.stockLevel;
    this.imageUrl = data.imageUrl;
  }
}

export class UpdateProductCommand implements ICommand {
  public readonly productId: string;
  public readonly name?: string;
  public readonly description?: string;
  public readonly category?: string;
  public readonly priceAmount?: number;
  public readonly currency?: string;
  public readonly stockLevel?: number;
  public readonly isActive?: boolean;
  public readonly imageUrl?: string;

  constructor(...args: unknown[]) {
    this.productId = args[0] as string;
    const data = args[1] as {
      name?: string;
      description?: string;
      category?: string;
      priceAmount?: number;
      currency?: string;
      stockLevel?: number;
      isActive?: boolean;
      imageUrl?: string;
    };
    this.name = data.name;
    this.description = data.description;
    this.category = data.category;
    this.priceAmount = data.priceAmount;
    this.currency = data.currency;
    this.stockLevel = data.stockLevel;
    this.isActive = data.isActive;
    this.imageUrl = data.imageUrl;
  }
}

export class DeleteProductCommand implements ICommand {
  public readonly productId: string;

  constructor(...args: unknown[]) {
    this.productId = args[0] as string;
  }
}

export class UpdateProductStockCommand implements ICommand {
  public readonly productId: string;
  public readonly quantity: number;

  constructor(...args: unknown[]) {
    this.productId = args[0] as string;
    this.quantity = args[1] as number;
  }
}
