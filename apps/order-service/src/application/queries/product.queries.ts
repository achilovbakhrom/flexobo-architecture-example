/**
 * Product queries
 */

import { IQuery } from '@flexobo/core';

export class GetProductByIdQuery implements IQuery {
  constructor(public readonly productId: string) {}
}

export class GetProductBySkuQuery implements IQuery {
  constructor(public readonly sku: string) {}
}

export class GetProductsByCategoryQuery implements IQuery {
  constructor(
    public readonly category: string,
    public readonly limit?: number,
    public readonly offset?: number
  ) {}
}

export class GetActiveProductsQuery implements IQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number
  ) {}
}

export class SearchProductsQuery implements IQuery {
  constructor(
    public readonly query: string,
    public readonly limit?: number,
    public readonly offset?: number
  ) {}
}
