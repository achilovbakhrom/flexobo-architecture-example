/**
 * Order commands
 */

import { ICommand } from '@flexobo/core';

export class CreateOrderCommand implements ICommand {
  public readonly orderId: string;
  public readonly userId: string;

  constructor(...args: unknown[]) {
    this.orderId = args[0] as string;
    this.userId = args[1] as string;
  }
}

export class AddOrderItemCommand implements ICommand {
  public readonly orderId: string;
  public readonly productId: string;
  public readonly productName: string;
  public readonly quantity: number;
  public readonly priceAmount: number;
  public readonly priceCurrency: string;

  constructor(...args: unknown[]) {
    this.orderId = args[0] as string;
    this.productId = args[1] as string;
    this.productName = args[2] as string;
    this.quantity = args[3] as number;
    this.priceAmount = args[4] as number;
    this.priceCurrency = args[5] as string;
  }
}

export class ConfirmOrderCommand implements ICommand {
  public readonly orderId: string;

  constructor(...args: unknown[]) {
    this.orderId = args[0] as string;
  }
}

export class CancelOrderCommand implements ICommand {
  public readonly orderId: string;
  public readonly reason: string;

  constructor(...args: unknown[]) {
    this.orderId = args[0] as string;
    this.reason = args[1] as string;
  }
}

export class ShipOrderCommand implements ICommand {
  public readonly orderId: string;
  public readonly trackingNumber: string;

  constructor(...args: unknown[]) {
    this.orderId = args[0] as string;
    this.trackingNumber = args[1] as string;
  }
}
