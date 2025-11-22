/**
 * Order commands
 */

import { ICommand } from '@flexobo/core';

export class CreateOrderCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly userId: string
  ) {}
}

export class AddOrderItemCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly productId: string,
    public readonly productName: string,
    public readonly quantity: number,
    public readonly priceAmount: number,
    public readonly priceCurrency: string
  ) {}
}

export class ConfirmOrderCommand implements ICommand {
  constructor(public readonly orderId: string) {}
}

export class CancelOrderCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly reason: string
  ) {}
}

export class ShipOrderCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly trackingNumber: string
  ) {}
}
