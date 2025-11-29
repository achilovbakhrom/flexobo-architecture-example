import { ICommand } from '@flexobo/core';

export class CreateInventoryCommand implements ICommand {
  constructor(
    public readonly inventoryId: string,
    public readonly productId: string,
    public readonly sku: string,
    public readonly productName: string,
    public readonly initialStock: number = 0
  ) {}
}

export class AddStockCommand implements ICommand {
  constructor(
    public readonly inventoryId: string,
    public readonly quantity: number,
    public readonly reason?: string
  ) {}
}

export class ReserveStockCommand implements ICommand {
  constructor(
    public readonly inventoryId: string,
    public readonly orderId: string,
    public readonly quantity: number,
    public readonly expirationMinutes?: number
  ) {}
}

export class ReserveStockByProductCommand implements ICommand {
  constructor(
    public readonly productId: string,
    public readonly orderId: string,
    public readonly quantity: number,
    public readonly expirationMinutes?: number
  ) {}
}

export class ConfirmReservationCommand implements ICommand {
  constructor(
    public readonly inventoryId: string,
    public readonly orderId: string
  ) {}
}

export class ReleaseReservationCommand implements ICommand {
  constructor(
    public readonly inventoryId: string,
    public readonly orderId: string,
    public readonly reason?: string
  ) {}
}

export class ReleaseReservationByOrderCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly reason?: string
  ) {}
}
