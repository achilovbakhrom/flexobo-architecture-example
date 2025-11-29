/**
 * Order queries
 */

import { IQuery } from '@flexobo/core';

export class GetOrderByIdQuery implements IQuery {
  constructor(public readonly orderId: string) {}
}

export class GetOrdersByUserQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly limit?: number,
    public readonly offset?: number
  ) {}
}

export class GetRecentOrdersQuery implements IQuery {
  constructor(public readonly limit?: number) {}
}

export class GetAllOrdersQuery implements IQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number
  ) {}
}
