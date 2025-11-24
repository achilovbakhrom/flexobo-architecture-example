/**
 * Order command handlers
 */

import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
} from '@flexobo/core';
import { Order } from '../../domain/order.aggregate';
import { IEventStore } from '@flexobo/core';
import { DomainEvent } from '@flexobo/core';
import {
  CreateOrderCommand,
  AddOrderItemCommand,
  ConfirmOrderCommand,
  CancelOrderCommand,
  ShipOrderCommand,
} from './order.commands';
import { Inject } from '@nestjs/common';

// Helper function to convert StoredEvent[] to DomainEvent[]
function toDomainEvents(
  stored: {
    eventData: Record<string, unknown>;
    eventType: string;
    version: number;
    occurredAt: Date;
    aggregateId: string;
    aggregateType: string;
  }[]
): DomainEvent[] {
  return stored.map((s) => ({
    type: s.eventType,
    aggregateId: s.aggregateId,
    aggregateType: s.aggregateType,
    version: s.version,
    occurredAt: s.occurredAt,
    data: s.eventData,
  }));
}

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler
  implements ICommandHandler<CreateOrderCommand, void>
{
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async execute(command: CreateOrderCommand): Promise<Result<void, Error>> {
    try {
      const order = Order.create(command.orderId, command.userId);
      console.log(JSON.stringify(order, null, 2));

      // Save events
      console.log('Saving events to event store...');
      await this.eventStore.append(
        command.orderId,
        order.getUncommittedEvents(),
        0
      );

      order.markEventsAsCommitted();
      console.log('Order created and saved to event store successfully');
      return new Success(undefined);
    } catch (error) {
      console.error('ERROR saving order to event store:', error);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(AddOrderItemCommand)
export class AddOrderItemHandler
  implements ICommandHandler<AddOrderItemCommand, void>
{
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async execute(command: AddOrderItemCommand): Promise<Result<void, Error>> {
    try {
      // Load order from event store
      const storedEvents = await this.eventStore.getEvents(command.orderId);
      const events = toDomainEvents(storedEvents);
      const order = Order.fromEvents(events);

      // Execute business logic
      order.addItem(
        command.productId,
        command.productName,
        command.quantity,
        command.priceAmount,
        command.priceCurrency
      );

      // Save new events
      await this.eventStore.append(
        command.orderId,
        order.getUncommittedEvents(),
        order.version - order.getUncommittedEvents().length
      );

      order.markEventsAsCommitted();
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
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async execute(command: ConfirmOrderCommand): Promise<Result<void, Error>> {
    try {
      const storedEvents = await this.eventStore.getEvents(command.orderId);
      const events = toDomainEvents(storedEvents);
      const order = Order.fromEvents(events);

      order.confirm();

      await this.eventStore.append(
        command.orderId,
        order.getUncommittedEvents(),
        order.version - order.getUncommittedEvents().length
      );

      order.markEventsAsCommitted();
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
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async execute(command: CancelOrderCommand): Promise<Result<void, Error>> {
    try {
      const storedEvents = await this.eventStore.getEvents(command.orderId);
      const events = toDomainEvents(storedEvents);
      const order = Order.fromEvents(events);

      order.cancel(command.reason);

      await this.eventStore.append(
        command.orderId,
        order.getUncommittedEvents(),
        order.version - order.getUncommittedEvents().length
      );

      order.markEventsAsCommitted();
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
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async execute(command: ShipOrderCommand): Promise<Result<void, Error>> {
    try {
      const storedEvents = await this.eventStore.getEvents(command.orderId);
      const events = toDomainEvents(storedEvents);
      const order = Order.fromEvents(events);

      order.ship(command.trackingNumber);

      await this.eventStore.append(
        command.orderId,
        order.getUncommittedEvents(),
        order.version - order.getUncommittedEvents().length
      );

      order.markEventsAsCommitted();
      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}
