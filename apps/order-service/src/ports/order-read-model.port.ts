/**
 * Order Read Model Port (Secondary/Driven Port)
 *
 * This port defines the contract for order read model queries.
 * It's separate from the event repository because CQRS separates
 * read and write concerns.
 *
 * The read model is optimized for queries while the event store
 * is the source of truth for writes.
 */

import {
  OrderReadModelDto,
  OrderWithItemsReadModelDto,
  OrderItemReadModelDto,
} from '../application/dto/order.dto';

/**
 * Port for Order read model queries
 */
export interface IOrderReadModelRepository {
  /**
   * Find an order by ID with all its items
   */
  findById(orderId: string): Promise<OrderWithItemsReadModelDto | null>;

  /**
   * Find all orders for a user
   */
  findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<OrderReadModelDto[]>;

  /**
   * Find recent orders
   */
  findRecent(limit: number): Promise<OrderReadModelDto[]>;

  /**
   * Find orders by status
   */
  findByStatus(
    status: string,
    options?: { limit?: number; offset?: number }
  ): Promise<OrderReadModelDto[]>;

  /**
   * Save or update order read model (used by projections)
   */
  upsert(order: Omit<OrderReadModelDto, 'createdAt'>): Promise<void>;

  /**
   * Save order item (used by projections)
   */
  saveItem(item: OrderItemReadModelDto): Promise<void>;

  /**
   * Delete order (used by projections when order is cancelled)
   */
  delete(orderId: string): Promise<void>;
}

export const ORDER_READ_MODEL_REPOSITORY = Symbol('IOrderReadModelRepository');
