/**
 * Product queries
 */

import { IQuery } from '@flexobo/core';

export class GetProductByIdQuery implements IQuery {
  public readonly productId: string;

  constructor(...args: unknown[]) {
    this.productId = args[0] as string;
  }
}

export class GetProductBySkuQuery implements IQuery {
  public readonly sku: string;

  constructor(...args: unknown[]) {
    this.sku = args[0] as string;
  }
}

export class GetProductsByCategoryQuery implements IQuery {
  public readonly category: string;
  public readonly limit?: number;
  public readonly offset?: number;

  constructor(...args: unknown[]) {
    this.category = args[0] as string;
    const options = args[1] as { limit?: number; offset?: number } | undefined;
    this.limit = options?.limit;
    this.offset = options?.offset;
  }
}

export class GetActiveProductsQuery implements IQuery {
  public readonly limit?: number;
  public readonly offset?: number;

  constructor(...args: unknown[]) {
    const options = args[0] as { limit?: number; offset?: number } | undefined;
    this.limit = options?.limit;
    this.offset = options?.offset;
  }
}

export class SearchProductsQuery implements IQuery {
  public readonly query: string;
  public readonly limit?: number;
  public readonly offset?: number;

  constructor(...args: unknown[]) {
    this.query = args[0] as string;
    const options = args[1] as { limit?: number; offset?: number } | undefined;
    this.limit = options?.limit;
    this.offset = options?.offset;
  }
}
