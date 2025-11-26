/**
 * Payment queries
 */

import { IQuery } from '@flexobo/core';

export class GetPaymentByIdQuery implements IQuery {
  public readonly paymentId: string;

  constructor(...args: unknown[]) {
    this.paymentId = args[0] as string;
  }
}

export class GetPaymentsByOrderQuery implements IQuery {
  public readonly orderId: string;

  constructor(...args: unknown[]) {
    this.orderId = args[0] as string;
  }
}

export class GetPaymentsByStatusQuery implements IQuery {
  public readonly status: string;
  public readonly limit?: number;
  public readonly offset?: number;

  constructor(...args: unknown[]) {
    this.status = args[0] as string;
    const options = args[1] as { limit?: number; offset?: number } | undefined;
    this.limit = options?.limit;
    this.offset = options?.offset;
  }
}

export class GetPaymentByTransactionIdQuery implements IQuery {
  public readonly transactionId: string;

  constructor(...args: unknown[]) {
    this.transactionId = args[0] as string;
  }
}
