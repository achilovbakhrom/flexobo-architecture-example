import {
  QueryHandler,
  IQueryHandler,
  IEventStore,
  DomainEvent,
} from '@flexobo/core';
import { Order } from '../../domain/order.aggregate';
import {
  GetOrderByIdQuery,
  GetOrdersByUserQuery,
  GetRecentOrdersQuery,
} from './order.queries';
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

@QueryHandler(GetOrderByIdQuery)
export class GetOrderByIdHandler implements IQueryHandler<GetOrderByIdQuery> {
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async execute(query: GetOrderByIdQuery): Promise<unknown> {
    const storedEvents = await this.eventStore.getEvents(query.orderId);

    if (storedEvents.length === 0) {
      return null;
    }

    const events = toDomainEvents(storedEvents);
    const order = Order.fromEvents(events);
    return order.getDetails();
  }
}

@QueryHandler(GetOrdersByUserQuery)
export class GetOrdersByUserHandler
  implements IQueryHandler<GetOrdersByUserQuery>
{
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async execute(query: GetOrdersByUserQuery): Promise<unknown> {
    // In a real implementation, you'd have a read model/projection
    // For this example, we'll return a placeholder
    return {
      userId: query.userId,
      orders: [],
      message: 'Read model not implemented - use projections in production',
    };
  }
}

@QueryHandler(GetRecentOrdersQuery)
export class GetRecentOrdersHandler
  implements IQueryHandler<GetRecentOrdersQuery>
{
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async execute(query: GetRecentOrdersQuery): Promise<unknown> {
    // In a real implementation, you'd query a read model
    return {
      limit: query.limit ?? 10,
      orders: [],
      message: 'Read model not implemented - use projections in production',
    };
  }
}
