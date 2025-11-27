import { ICommand } from '@flexobo/core';

export class CreateInventoryCommand implements ICommand {
  public readonly inventoryId: string;
  public readonly productId: string;
  public readonly sku: string;
  public readonly productName: string;
  public readonly initialStock: number;

  constructor(...args: unknown[]) {
    this.inventoryId = args[0] as string;
    this.productId = args[1] as string;
    this.sku = args[2] as string;
    this.productName = args[3] as string;
    this.initialStock = (args[4] as number) ?? 0;
  }
}

export class AddStockCommand implements ICommand {
  public readonly inventoryId: string;
  public readonly quantity: number;
  public readonly reason?: string;

  constructor(...args: unknown[]) {
    this.inventoryId = args[0] as string;
    this.quantity = args[1] as number;
    this.reason = args[2] as string | undefined;
  }
}

export class ReserveStockCommand implements ICommand {
  public readonly inventoryId: string;
  public readonly orderId: string;
  public readonly quantity: number;
  public readonly expirationMinutes?: number;

  constructor(...args: unknown[]) {
    this.inventoryId = args[0] as string;
    this.orderId = args[1] as string;
    this.quantity = args[2] as number;
    this.expirationMinutes = args[3] as number | undefined;
  }
}

export class ReserveStockByProductCommand implements ICommand {
  public readonly productId: string;
  public readonly orderId: string;
  public readonly quantity: number;
  public readonly expirationMinutes?: number;

  constructor(...args: unknown[]) {
    this.productId = args[0] as string;
    this.orderId = args[1] as string;
    this.quantity = args[2] as number;
    this.expirationMinutes = args[3] as number | undefined;
  }
}

export class ConfirmReservationCommand implements ICommand {
  public readonly inventoryId: string;
  public readonly orderId: string;

  constructor(...args: unknown[]) {
    this.inventoryId = args[0] as string;
    this.orderId = args[1] as string;
  }
}

export class ReleaseReservationCommand implements ICommand {
  public readonly inventoryId: string;
  public readonly orderId: string;
  public readonly reason?: string;

  constructor(...args: unknown[]) {
    this.inventoryId = args[0] as string;
    this.orderId = args[1] as string;
    this.reason = args[2] as string | undefined;
  }
}

export class ReleaseReservationByOrderCommand implements ICommand {
  public readonly orderId: string;
  public readonly reason?: string;

  constructor(...args: unknown[]) {
    this.orderId = args[0] as string;
    this.reason = args[1] as string | undefined;
  }
}
