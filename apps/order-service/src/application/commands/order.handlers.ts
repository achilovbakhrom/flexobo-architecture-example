import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  DomainEvent,
  OutboxService,
} from '@flexobo/core';
import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
  MarkInventoryReservedCommand,
  MarkInventoryFailedCommand,
} from './order.commands';

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

async function saveOrder(
  repository: IOrderEventRepository,
  order: Order,
  outboxService: OutboxService,
  eventEmitter: EventEmitter2
): Promise<DomainEvent[]> {
  const uncommittedEvents = order.getUncommittedEvents();

  if (uncommittedEvents.length === 0) {
    return [];
  }

  const expectedVersion = order.version - uncommittedEvents.length;

  const events = uncommittedEvents.map((event) => ({
    type: event.type,
    data: event.data,
    aggregateType: event.aggregateType,
  }));

  await repository.appendEvents(order.id, events, expectedVersion);

  await outboxService.saveEvents(uncommittedEvents, order.id, 'Order');

  for (const event of uncommittedEvents) {
    // Convert PascalCase event type to snake_case event name
    // e.g., OrderItemAdded -> order.item_added
    const eventTypeName = event.type
      .replace(/^Order/, '') // Remove 'Order' prefix
      .replace(/([A-Z])/g, '_$1') // Add underscore before capitals
      .toLowerCase()
      .replace(/^_/, ''); // Remove leading underscore
    const eventName = `order.${eventTypeName}`;
    eventEmitter.emit(eventName, {
      aggregateId: event.aggregateId,
      eventType: event.type,
      data: event.data,
      version: event.version,
    });
  }

  order.markEventsAsCommitted();

  return uncommittedEvents;
}

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler
  implements ICommandHandler<CreateOrderCommand, void>
{
  constructor(
    @Inject(ORDER_EVENT_REPOSITORY)
    private readonly eventRepository: IOrderEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(command: CreateOrderCommand): Promise<Result<void, Error>> {
    try {
      const exists = await this.eventRepository.exists(command.orderId);
      if (exists) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} already exists`),
        };
      }

      const order = Order.create(command.orderId, command.userId);

      await saveOrder(
        this.eventRepository,
        order,
        this.outboxService,
        this.eventEmitter
      );

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
    private readonly eventRepository: IOrderEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(command: AddOrderItemCommand): Promise<Result<void, Error>> {
    try {
      const order = await loadOrder(this.eventRepository, command.orderId);

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

      await saveOrder(
        this.eventRepository,
        order,
        this.outboxService,
        this.eventEmitter
      );

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
    private readonly eventRepository: IOrderEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
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

      await saveOrder(
        this.eventRepository,
        order,
        this.outboxService,
        this.eventEmitter
      );

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
    private readonly eventRepository: IOrderEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
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

      await saveOrder(
        this.eventRepository,
        order,
        this.outboxService,
        this.eventEmitter
      );

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
    private readonly eventRepository: IOrderEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
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

      await saveOrder(
        this.eventRepository,
        order,
        this.outboxService,
        this.eventEmitter
      );

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
    @Inject(ORDER_EVENT_REPOSITORY)
    private readonly eventRepository: IOrderEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(
    command: MarkInventoryReservedCommand
  ): Promise<Result<void, Error>> {
    try {
      const order = await loadOrder(this.eventRepository, command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.markInventoryReserved(command.reservations);

      await saveOrder(
        this.eventRepository,
        order,
        this.outboxService,
        this.eventEmitter
      );

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
    @Inject(ORDER_EVENT_REPOSITORY)
    private readonly eventRepository: IOrderEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(
    command: MarkInventoryFailedCommand
  ): Promise<Result<void, Error>> {
    try {
      const order = await loadOrder(this.eventRepository, command.orderId);

      if (!order) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Order ${command.orderId} not found`),
        };
      }

      order.markInventoryFailed(command.failedProductIds, command.reason);

      await saveOrder(
        this.eventRepository,
        order,
        this.outboxService,
        this.eventEmitter
      );

      return new Success(undefined);
    } catch (error) {
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}
