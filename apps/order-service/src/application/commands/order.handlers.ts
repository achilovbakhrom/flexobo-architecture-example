/**
 * Order command handlers
 *
 * These handlers use the IOrderEventRepository to persist and load order events.
 * The application layer is responsible for:
 * - Reconstructing domain aggregates from events
 * - Executing business logic on aggregates
 * - Converting uncommitted events to storable format
 *
 * This maintains proper hexagonal architecture separation:
 * - Infrastructure (adapter) works only with DTOs/events
 * - Application layer knows about domain entities
 * - Domain layer remains pure
 */

import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  DomainEvent,
} from '@flexobo/core';
import { Order } from '../../domain/order.aggregate';
import {
  IOrderEventRepository,
  ORDER_EVENT_REPOSITORY,
} from '../../ports/order.repository.port';
import { StoredEventDto } from '../dto/order.dto';
import {
  CreateOrderCommand,
  AddOrderItemCommand,
  ConfirmOrderCommand,
  CancelOrderCommand,
  ShipOrderCommand,
} from './order.commands';
import { Inject } from '@nestjs/common';

/**
 * Converts stored events to domain events for aggregate reconstruction
 */
function toDomainEvents(stored: StoredEventDto[]): DomainEvent[] {
  return stored.map((s) => ({
    type: s.eventType,
    aggregateId: s.aggregateId,
    aggregateType: s.aggregateType,
    version: s.version,
    occurredAt: s.occurredAt,
    data: s.eventData,
  }));
}

/**
 * Loads an Order aggregate from stored events
 */
async function loadOrder(
  repository: IOrderEventRepository,
  orderId: string
): Promise<Order | null> {
  const storedEvents = await repository.getEvents(orderId);

  if (storedEvents.length === 0) {
    return null;
  }

  const events = toDomainEvents(storedEvents);
  return Order.fromEvents(events);
}

/**
 * Saves uncommitted events from an Order aggregate
 */
async function saveOrder(
  repository: IOrderEventRepository,
  order: Order
): Promise<void> {
  const uncommittedEvents = order.getUncommittedEvents();

  if (uncommittedEvents.length === 0) {
    return;
  }

  // Calculate expected version for optimistic concurrency
  const expectedVersion = order.version - uncommittedEvents.length;

  // Convert domain events to storable format
  const events = uncommittedEvents.map((event) => ({
    type: event.type,
    data: event.data,
    aggregateType: event.aggregateType,
  }));

  await repository.appendEvents(order.id, events, expectedVersion);

  order.markEventsAsCommitted();
}

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler
  implements ICommandHandler<CreateOrderCommand, void>
{
  constructor(
    @Inject(ORDER_EVENT_REPOSITORY)
    private readonly eventRepository: IOrderEventRepository
  ) {}

  async execute(command: CreateOrderCommand): Promise<Result<void, Error>> {
    try {
      // Check if order already exists
      const exists = await this.eventRepository.exists(command.orderId);
      if (exists) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} already exists`),
        };
      }

      // Create new order (domain logic)
      const order = Order.create(command.orderId, command.userId);

      // Save events through repository
      await saveOrder(this.eventRepository, order);

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
    @Inject(ORDER_EVENT_REPOSITORY)
    private readonly eventRepository: IOrderEventRepository
  ) {}

  async execute(command: AddOrderItemCommand): Promise<Result<void, Error>> {
    try {
      // Load order from events
      const order = await loadOrder(this.eventRepository, command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      // Execute business logic (domain)
      order.addItem(
        command.productId,
        command.productName,
        command.quantity,
        command.priceAmount,
        command.priceCurrency
      );

      // Save events
      await saveOrder(this.eventRepository, order);

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
    @Inject(ORDER_EVENT_REPOSITORY)
    private readonly eventRepository: IOrderEventRepository
  ) {}

  async execute(command: ConfirmOrderCommand): Promise<Result<void, Error>> {
    try {
      const order = await loadOrder(this.eventRepository, command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.confirm();

      await saveOrder(this.eventRepository, order);

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
    @Inject(ORDER_EVENT_REPOSITORY)
    private readonly eventRepository: IOrderEventRepository
  ) {}

  async execute(command: CancelOrderCommand): Promise<Result<void, Error>> {
    try {
      const order = await loadOrder(this.eventRepository, command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.cancel(command.reason);

      await saveOrder(this.eventRepository, order);

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
    @Inject(ORDER_EVENT_REPOSITORY)
    private readonly eventRepository: IOrderEventRepository
  ) {}

  async execute(command: ShipOrderCommand): Promise<Result<void, Error>> {
    try {
      const order = await loadOrder(this.eventRepository, command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.ship(command.trackingNumber);

      await saveOrder(this.eventRepository, order);

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}
