import { ICommand } from '@flexobo/core';

export interface CreatePaymentData {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

export class CreatePaymentCommand implements ICommand {
  public readonly paymentId: string;
  public readonly orderId: string;
  public readonly amount: number;
  public readonly currency: string;
  public readonly paymentMethod: string;

  constructor(data: CreatePaymentData) {
    this.paymentId = data.paymentId;
    this.orderId = data.orderId;
    this.amount = data.amount;
    this.currency = data.currency;
    this.paymentMethod = data.paymentMethod;
  }
}

export class ProcessPaymentCommand implements ICommand {
  constructor(public readonly paymentId: string) {}
}

export class CompletePaymentCommand implements ICommand {
  constructor(
    public readonly paymentId: string,
    public readonly transactionId: string
  ) {}
}

export class FailPaymentCommand implements ICommand {
  constructor(
    public readonly paymentId: string,
    public readonly reason: string
  ) {}
}

export class RefundPaymentCommand implements ICommand {
  constructor(
    public readonly paymentId: string,
    public readonly amount: number,
    public readonly reason: string = 'Refund requested'
  ) {}
}
