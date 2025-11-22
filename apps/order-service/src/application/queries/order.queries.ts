/**
 * Order queries
 */

import { IQuery } from '@flexobo/core';

export class GetOrderByIdQuery implements IQuery {
  public readonly orderId: string;

  constructor(...args: unknown[]) {
    this.orderId = args[0] as string;
  }
}

export class GetOrdersByUserQuery implements IQuery {
  public readonly userId: string;

  constructor(...args: unknown[]) {
    this.userId = args[0] as string;
  }
}

export class GetRecentOrdersQuery implements IQuery {
  public readonly limit?: number;

  constructor(...args: unknown[]) {
    this.limit = args[0] as number | undefined;
  }
}
