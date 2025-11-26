/**
 * Payment commands
 *
 * Payment is event-sourced.
 */

import { ICommand } from '@flexobo/core';

export class CreatePaymentCommand implements ICommand {
  public readonly paymentId: string;
  public readonly orderId: string;
  public readonly amount: number;
  public readonly currency: string;
  public readonly paymentMethod: string;

  constructor(...args: unknown[]) {
    const data = args[0] as {
      paymentId: string;
      orderId: string;
      amount: number;
      currency: string;
      paymentMethod: string;
    };
    this.paymentId = data.paymentId;
    this.orderId = data.orderId;
    this.amount = data.amount;
    this.currency = data.currency;
    this.paymentMethod = data.paymentMethod;
  }
}

export class ProcessPaymentCommand implements ICommand {
  public readonly paymentId: string;

  constructor(...args: unknown[]) {
    this.paymentId = args[0] as string;
  }
}

export class CompletePaymentCommand implements ICommand {
  public readonly paymentId: string;
  public readonly transactionId: string;

  constructor(...args: unknown[]) {
    this.paymentId = args[0] as string;
    this.transactionId = args[1] as string;
  }
}

export class FailPaymentCommand implements ICommand {
  public readonly paymentId: string;
  public readonly reason: string;

  constructor(...args: unknown[]) {
    this.paymentId = args[0] as string;
    this.reason = args[1] as string;
  }
}

export class RefundPaymentCommand implements ICommand {
  public readonly paymentId: string;
  public readonly amount: number;
  public readonly reason: string;

  constructor(...args: unknown[]) {
    this.paymentId = args[0] as string;
    this.amount = args[1] as number;
    this.reason = args[2] as string;
  }
}
