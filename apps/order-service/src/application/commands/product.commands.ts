/**
 * Product commands
 *
 * Product is simple CRUD (not event-sourced).
 */

import { ICommand } from '@flexobo/core';

export interface CreateProductData {
  productId: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  priceAmount: number;
  currency?: string;
  stockLevel?: number;
  imageUrl?: string;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  category?: string;
  priceAmount?: number;
  currency?: string;
  stockLevel?: number;
  isActive?: boolean;
  imageUrl?: string;
}

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

  constructor(data: CreateProductData) {
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

  constructor(productId: string, data: UpdateProductData) {
    this.productId = productId;
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
  constructor(public readonly productId: string) {}
}

export class UpdateProductStockCommand implements ICommand {
  constructor(
    public readonly productId: string,
    public readonly quantity: number
  ) {}
}
