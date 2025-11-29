/**
 * Payment queries
 */

import { IQuery } from '@flexobo/core';

export class GetPaymentByIdQuery implements IQuery {
  constructor(public readonly paymentId: string) {}
}

export class GetPaymentsByOrderQuery implements IQuery {
  constructor(public readonly orderId: string) {}
}

export class GetPaymentsByStatusQuery implements IQuery {
  constructor(
    public readonly status: string,
    public readonly limit?: number,
    public readonly offset?: number
  ) {}
}

export class GetPaymentByTransactionIdQuery implements IQuery {
  constructor(public readonly transactionId: string) {}
}
