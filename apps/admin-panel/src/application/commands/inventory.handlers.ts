import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  DomainEvent,
  OutboxService,
} from '@flexobo/core';
import { Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Inventory } from '../../domain/inventory.aggregate';
import {
  IInventoryEventRepository,
  INVENTORY_EVENT_REPOSITORY,
  StoredEventDto,
} from '../../ports/inventory.repository.port';
import {
  IInventoryReadModelRepository,
  INVENTORY_READ_MODEL_REPOSITORY,
} from '../../ports/inventory-read-model.port';
import {
  CreateInventoryCommand,
  AddStockCommand,
  ReserveStockCommand,
  ReserveStockByProductCommand,
  ConfirmReservationCommand,
  ReleaseReservationCommand,
  ReleaseReservationByOrderCommand,
} from './inventory.commands';

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

async function loadInventory(
  repository: IInventoryEventRepository,
  inventoryId: string
): Promise<Inventory | null> {
  const storedEvents = await repository.getEvents(inventoryId);

  if (storedEvents.length === 0) {
    return null;
  }

  const events = toDomainEvents(storedEvents);
  return Inventory.fromEvents(events);
}

async function saveInventory(
  repository: IInventoryEventRepository,
  inventory: Inventory,
  outboxService: OutboxService,
  eventEmitter: EventEmitter2
): Promise<DomainEvent[]> {
  const uncommittedEvents = inventory.getUncommittedEvents();

  if (uncommittedEvents.length === 0) {
    return [];
  }

  const expectedVersion = inventory.version - uncommittedEvents.length;

  const events = uncommittedEvents.map((event) => ({
    type: event.type,
    data: event.data,
    aggregateType: event.aggregateType,
  }));

  await repository.appendEvents(inventory.id, events, expectedVersion);

  await outboxService.saveEvents(
    uncommittedEvents,
    inventory.id,
    'Inventory'
  );

  for (const event of uncommittedEvents) {
    const eventName = `inventory.${event.type.toLowerCase().replace('inventory', '').replace('stock', '')}`;
    eventEmitter.emit(eventName, {
      aggregateId: event.aggregateId,
      eventType: event.type,
      data: event.data,
      version: event.version,
    });
  }

  inventory.markEventsAsCommitted();

  return uncommittedEvents;
}

@CommandHandler(CreateInventoryCommand)
export class CreateInventoryHandler
  implements ICommandHandler<CreateInventoryCommand, void>
{
  private readonly logger = new Logger(CreateInventoryHandler.name);

  constructor(
    @Inject(INVENTORY_EVENT_REPOSITORY)
    private readonly eventRepository: IInventoryEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(
    command: CreateInventoryCommand
  ): Promise<Result<void, Error>> {
    try {
      const exists = await this.eventRepository.exists(command.inventoryId);
      if (exists) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(
            `Inventory ${command.inventoryId} already exists`
          ),
        };
      }

      const inventory = Inventory.create(
        command.inventoryId,
        command.productId,
        command.sku,
        command.productName,
        command.initialStock
      );

      await saveInventory(
        this.eventRepository,
        inventory,
        this.outboxService,
        this.eventEmitter
      );

      this.logger.log(
        `Created inventory ${command.inventoryId} for product ${command.productId}`
      );

      return new Success(undefined);
    } catch (error) {
      this.logger.error('Error creating inventory:', error);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(AddStockCommand)
export class AddStockHandler
  implements ICommandHandler<AddStockCommand, void>
{
  private readonly logger = new Logger(AddStockHandler.name);

  constructor(
    @Inject(INVENTORY_EVENT_REPOSITORY)
    private readonly eventRepository: IInventoryEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(command: AddStockCommand): Promise<Result<void, Error>> {
    try {
      const inventory = await loadInventory(
        this.eventRepository,
        command.inventoryId
      );

      if (!inventory) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Inventory ${command.inventoryId} not found`),
        };
      }

      inventory.addStock(command.quantity, command.reason);

      await saveInventory(
        this.eventRepository,
        inventory,
        this.outboxService,
        this.eventEmitter
      );

      this.logger.log(
        `Added ${command.quantity} stock to inventory ${command.inventoryId}`
      );

      return new Success(undefined);
    } catch (error) {
      this.logger.error('Error adding stock:', error);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(ReserveStockCommand)
export class ReserveStockHandler
  implements ICommandHandler<ReserveStockCommand, boolean>
{
  private readonly logger = new Logger(ReserveStockHandler.name);

  constructor(
    @Inject(INVENTORY_EVENT_REPOSITORY)
    private readonly eventRepository: IInventoryEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(command: ReserveStockCommand): Promise<Result<boolean, Error>> {
    try {
      const inventory = await loadInventory(
        this.eventRepository,
        command.inventoryId
      );

      if (!inventory) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Inventory ${command.inventoryId} not found`),
        };
      }

      const success = inventory.reserveStock(
        command.orderId,
        command.quantity,
        command.expirationMinutes
      );

      await saveInventory(
        this.eventRepository,
        inventory,
        this.outboxService,
        this.eventEmitter
      );

      this.logger.log(
        `Reserve stock for order ${command.orderId}: ${success ? 'SUCCESS' : 'FAILED'}`
      );

      return new Success(success);
    } catch (error) {
      this.logger.error('Error reserving stock:', error);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(ReserveStockByProductCommand)
export class ReserveStockByProductHandler
  implements ICommandHandler<ReserveStockByProductCommand, boolean>
{
  private readonly logger = new Logger(ReserveStockByProductHandler.name);

  constructor(
    @Inject(INVENTORY_EVENT_REPOSITORY)
    private readonly eventRepository: IInventoryEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(
    command: ReserveStockByProductCommand
  ): Promise<Result<boolean, Error>> {
    try {
      const events = await this.eventRepository.findByProductId(
        command.productId
      );

      if (!events || events.length === 0) {
        this.logger.warn(
          `No inventory found for product ${command.productId}`
        );
        return new Success(false);
      }

      const inventory = Inventory.fromEvents(toDomainEvents(events));

      const success = inventory.reserveStock(
        command.orderId,
        command.quantity,
        command.expirationMinutes
      );

      await saveInventory(
        this.eventRepository,
        inventory,
        this.outboxService,
        this.eventEmitter
      );

      this.logger.log(
        `Reserve stock for product ${command.productId}, order ${command.orderId}: ${success ? 'SUCCESS' : 'FAILED'}`
      );

      return new Success(success);
    } catch (error) {
      this.logger.error('Error reserving stock by product:', error);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(ConfirmReservationCommand)
export class ConfirmReservationHandler
  implements ICommandHandler<ConfirmReservationCommand, void>
{
  private readonly logger = new Logger(ConfirmReservationHandler.name);

  constructor(
    @Inject(INVENTORY_EVENT_REPOSITORY)
    private readonly eventRepository: IInventoryEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(
    command: ConfirmReservationCommand
  ): Promise<Result<void, Error>> {
    try {
      const inventory = await loadInventory(
        this.eventRepository,
        command.inventoryId
      );

      if (!inventory) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Inventory ${command.inventoryId} not found`),
        };
      }

      inventory.confirmReservation(command.orderId);

      await saveInventory(
        this.eventRepository,
        inventory,
        this.outboxService,
        this.eventEmitter
      );

      this.logger.log(
        `Confirmed reservation for order ${command.orderId}`
      );

      return new Success(undefined);
    } catch (error) {
      this.logger.error('Error confirming reservation:', error);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(ReleaseReservationCommand)
export class ReleaseReservationHandler
  implements ICommandHandler<ReleaseReservationCommand, void>
{
  private readonly logger = new Logger(ReleaseReservationHandler.name);

  constructor(
    @Inject(INVENTORY_EVENT_REPOSITORY)
    private readonly eventRepository: IInventoryEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(
    command: ReleaseReservationCommand
  ): Promise<Result<void, Error>> {
    try {
      const inventory = await loadInventory(
        this.eventRepository,
        command.inventoryId
      );

      if (!inventory) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`Inventory ${command.inventoryId} not found`),
        };
      }

      inventory.releaseReservation(command.orderId, command.reason);

      await saveInventory(
        this.eventRepository,
        inventory,
        this.outboxService,
        this.eventEmitter
      );

      this.logger.log(
        `Released reservation for order ${command.orderId}`
      );

      return new Success(undefined);
    } catch (error) {
      this.logger.error('Error releasing reservation:', error);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

@CommandHandler(ReleaseReservationByOrderCommand)
export class ReleaseReservationByOrderHandler
  implements ICommandHandler<ReleaseReservationByOrderCommand, void>
{
  private readonly logger = new Logger(ReleaseReservationByOrderHandler.name);

  constructor(
    @Inject(INVENTORY_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IInventoryReadModelRepository,
    @Inject(INVENTORY_EVENT_REPOSITORY)
    private readonly eventRepository: IInventoryEventRepository,
    private readonly outboxService: OutboxService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async execute(
    command: ReleaseReservationByOrderCommand
  ): Promise<Result<void, Error>> {
    try {
      const reservation = await this.readModelRepository.getReservationByOrderId(
        command.orderId
      );

      if (!reservation) {
        this.logger.warn(`No reservation found for order ${command.orderId}`);
        return new Success(undefined);
      }

      const inventory = await loadInventory(
        this.eventRepository,
        reservation.inventoryId
      );

      if (!inventory) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(
            `Inventory ${reservation.inventoryId} not found`
          ),
        };
      }

      inventory.releaseReservation(command.orderId, command.reason);

      await saveInventory(
        this.eventRepository,
        inventory,
        this.outboxService,
        this.eventEmitter
      );

      this.logger.log(
        `Released reservation for order ${command.orderId}`
      );

      return new Success(undefined);
    } catch (error) {
      this.logger.error('Error releasing reservation by order:', error);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}
