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
  public readonly limit?: number;
  public readonly offset?: number;

  constructor(...args: unknown[]) {
    this.userId = args[0] as string;
    const options = args[1] as { limit?: number; offset?: number } | undefined;
    this.limit = options?.limit;
    this.offset = options?.offset;
  }
}

export class GetRecentOrdersQuery implements IQuery {
  public readonly limit?: number;

  constructor(...args: unknown[]) {
    this.limit = args[0] as number | undefined;
  }
}
