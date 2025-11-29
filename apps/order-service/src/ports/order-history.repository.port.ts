import {
  OrderHistoryDto,
  CreateOrderHistoryEntryDto,
  OrderHistoryQueryDto,
} from '../application/dto/order-history.dto';

export interface IOrderHistoryRepository {
  findByOrderId(
    orderId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<OrderHistoryDto[]>;

  findByEventType(
    eventType: string,
    options?: { limit?: number; offset?: number }
  ): Promise<OrderHistoryDto[]>;

  query(params: OrderHistoryQueryDto): Promise<OrderHistoryDto[]>;

  findById(historyId: string): Promise<OrderHistoryDto | null>;

  create(entry: CreateOrderHistoryEntryDto): Promise<OrderHistoryDto>;

  findLatestByOrderId(orderId: string): Promise<OrderHistoryDto | null>;

  countByOrderId(orderId: string): Promise<number>;
}

export const ORDER_HISTORY_REPOSITORY = Symbol('IOrderHistoryRepository');
