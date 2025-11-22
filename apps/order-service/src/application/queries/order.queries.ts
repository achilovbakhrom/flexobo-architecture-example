/**
 * Order queries
 */

import { IQuery } from '@flexobo/core';

export class GetOrderByIdQuery implements IQuery {
  constructor(public readonly orderId: string) {}
}

export class GetOrdersByUserQuery implements IQuery {
  constructor(public readonly userId: string) {}
}

export class GetRecentOrdersQuery implements IQuery {
  constructor(public readonly limit: number = 10) {}
}
