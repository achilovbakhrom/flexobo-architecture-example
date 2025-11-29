import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
} from '@flexobo/core';
import { Inject } from '@nestjs/common';
import { Order } from '../../domain/order.aggregate';
import {
  IOrderAggregateStore,
  ORDER_AGGREGATE_STORE,
} from '../../ports/order-store.port';
import {
  CreateOrderCommand,
  AddOrderItemCommand,
  ConfirmOrderCommand,
  CancelOrderCommand,
  ShipOrderCommand,
  MarkInventoryReservedCommand,
  MarkInventoryFailedCommand,
  MarkOrderPaidCommand,
} from './order.commands';

/**
 * Command Handlers for Order Aggregate
 *
 * Following Go gaze-executor pattern:
 * - Load aggregate from store
 * - Execute domain logic (aggregate methods raise events)
 * - Save aggregate to store (persists events + publishes to broker)
 *
 * Projections (OrderEventConsumer) handle:
 * - Listening to events from broker
 * - Updating read models
 * - Creating snapshots
 */

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler
  implements ICommandHandler<CreateOrderCommand, void>
{
  constructor(
    @Inject(ORDER_AGGREGATE_STORE)
    private readonly store: IOrderAggregateStore
  ) {}

  async execute(command: CreateOrderCommand): Promise<Result<void, Error>> {
    try {
      const exists = await this.store.exists(command.orderId);
      if (exists) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} already exists`),
        };
      }

      const order = Order.create(command.orderId, command.userId);
      await this.store.save(order);

      return new Success(undefined);
    } catch (error) {
      console.error('ERROR creating order:', error);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(AddOrderItemCommand)
export class AddOrderItemHandler
  implements ICommandHandler<AddOrderItemCommand, void>
{
  constructor(
    @Inject(ORDER_AGGREGATE_STORE)
    private readonly store: IOrderAggregateStore
  ) {}

  async execute(command: AddOrderItemCommand): Promise<Result<void, Error>> {
    try {
      const order = await this.store.load(command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.addItem(
        command.productId,
        command.productName,
        command.quantity,
        command.priceAmount,
        command.priceCurrency
      );

      await this.store.save(order);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(ConfirmOrderCommand)
export class ConfirmOrderHandler
  implements ICommandHandler<ConfirmOrderCommand, void>
{
  constructor(
    @Inject(ORDER_AGGREGATE_STORE)
    private readonly store: IOrderAggregateStore
  ) {}

  async execute(command: ConfirmOrderCommand): Promise<Result<void, Error>> {
    try {
      const order = await this.store.load(command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.confirm();
      await this.store.save(order);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler
  implements ICommandHandler<CancelOrderCommand, void>
{
  constructor(
    @Inject(ORDER_AGGREGATE_STORE)
    private readonly store: IOrderAggregateStore
  ) {}

  async execute(command: CancelOrderCommand): Promise<Result<void, Error>> {
    try {
      const order = await this.store.load(command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.cancel(command.reason);
      await this.store.save(order);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(ShipOrderCommand)
export class ShipOrderHandler
  implements ICommandHandler<ShipOrderCommand, void>
{
  constructor(
    @Inject(ORDER_AGGREGATE_STORE)
    private readonly store: IOrderAggregateStore
  ) {}

  async execute(command: ShipOrderCommand): Promise<Result<void, Error>> {
    try {
      const order = await this.store.load(command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.ship(command.trackingNumber);
      await this.store.save(order);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(MarkInventoryReservedCommand)
export class MarkInventoryReservedHandler
  implements ICommandHandler<MarkInventoryReservedCommand, void>
{
  constructor(
    @Inject(ORDER_AGGREGATE_STORE)
    private readonly store: IOrderAggregateStore
  ) {}

  async execute(
    command: MarkInventoryReservedCommand
  ): Promise<Result<void, Error>> {
    try {
      const order = await this.store.load(command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.markInventoryReserved(command.reservations);
      await this.store.save(order);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(MarkInventoryFailedCommand)
export class MarkInventoryFailedHandler
  implements ICommandHandler<MarkInventoryFailedCommand, void>
{
  constructor(
    @Inject(ORDER_AGGREGATE_STORE)
    private readonly store: IOrderAggregateStore
  ) {}

  async execute(
    command: MarkInventoryFailedCommand
  ): Promise<Result<void, Error>> {
    try {
      const order = await this.store.load(command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.markInventoryFailed(command.failedProductIds, command.reason);
      await this.store.save(order);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(MarkOrderPaidCommand)
export class MarkOrderPaidHandler
  implements ICommandHandler<MarkOrderPaidCommand, void>
{
  constructor(
    @Inject(ORDER_AGGREGATE_STORE)
    private readonly store: IOrderAggregateStore
  ) {}

  async execute(command: MarkOrderPaidCommand): Promise<Result<void, Error>> {
    try {
      const order = await this.store.load(command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.markPaid(command.paymentId, command.transactionId);
      await this.store.save(order);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}
