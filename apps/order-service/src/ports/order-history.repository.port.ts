/**
 * Order History Repository Port
 *
 * Order History is a read-only projection (audit log).
 * It only supports read operations and insertions from projections.
 */

import {
  OrderHistoryDto,
  CreateOrderHistoryEntryDto,
  OrderHistoryQueryDto,
} from '../application/dto/order-history.dto';

export interface IOrderHistoryRepository {
  /**
   * Get history for an order
   */
  findByOrderId(
    orderId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<OrderHistoryDto[]>;

  /**
   * Get history by event type
   */
  findByEventType(
    eventType: string,
    options?: { limit?: number; offset?: number }
  ): Promise<OrderHistoryDto[]>;

  /**
   * Query history with filters
   */
  query(params: OrderHistoryQueryDto): Promise<OrderHistoryDto[]>;

  /**
   * Get a specific history entry
   */
  findById(historyId: string): Promise<OrderHistoryDto | null>;

  /**
   * Add a history entry (used by projections)
   */
  create(entry: CreateOrderHistoryEntryDto): Promise<OrderHistoryDto>;

  /**
   * Get latest entry for an order
   */
  findLatestByOrderId(orderId: string): Promise<OrderHistoryDto | null>;

  /**
   * Count entries for an order
   */
  countByOrderId(orderId: string): Promise<number>;
}

export const ORDER_HISTORY_REPOSITORY = Symbol('IOrderHistoryRepository');
