/**
 * Order query handlers
 *
 * These handlers use the IOrderReadModelRepository to query orders.
 * The read model is optimized for queries (CQRS pattern).
 *
 * This maintains proper hexagonal architecture separation:
 * - Queries use read model (projection)
 * - Commands use event store
 */

import { QueryHandler, IQueryHandler } from '@flexobo/core';
import {
  IOrderReadModelRepository,
  ORDER_READ_MODEL_REPOSITORY,
} from '../../ports/order-read-model.port';
import {
  GetOrderByIdQuery,
  GetOrdersByUserQuery,
  GetRecentOrdersQuery,
} from './order.queries';
import { Inject } from '@nestjs/common';
import {
  OrderReadModelDto,
  OrderWithItemsReadModelDto,
} from '../dto/order.dto';

@QueryHandler(GetOrderByIdQuery)
export class GetOrderByIdHandler implements IQueryHandler<GetOrderByIdQuery> {
  constructor(
    @Inject(ORDER_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IOrderReadModelRepository
  ) {}

  async execute(
    query: GetOrderByIdQuery
  ): Promise<OrderWithItemsReadModelDto | null> {
    return this.readModelRepository.findById(query.orderId);
  }
}

@QueryHandler(GetOrdersByUserQuery)
export class GetOrdersByUserHandler
  implements IQueryHandler<GetOrdersByUserQuery>
{
  constructor(
    @Inject(ORDER_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IOrderReadModelRepository
  ) {}

  async execute(query: GetOrdersByUserQuery): Promise<{
    userId: string;
    orders: OrderReadModelDto[];
  }> {
    const orders = await this.readModelRepository.findByUserId(query.userId, {
      limit: query.limit,
      offset: query.offset,
    });

    return {
      userId: query.userId,
      orders,
    };
  }
}

@QueryHandler(GetRecentOrdersQuery)
export class GetRecentOrdersHandler
  implements IQueryHandler<GetRecentOrdersQuery>
{
  constructor(
    @Inject(ORDER_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IOrderReadModelRepository
  ) {}

  async execute(query: GetRecentOrdersQuery): Promise<{
    limit: number;
    orders: OrderReadModelDto[];
  }> {
    const limit = query.limit ?? 10;
    const orders = await this.readModelRepository.findRecent(limit);

    return {
      limit,
      orders,
    };
  }
}
