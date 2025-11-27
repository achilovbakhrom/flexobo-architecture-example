import {
  OrderReadModelDto,
  OrderWithItemsReadModelDto,
  OrderItemReadModelDto,
} from '../application/dto/order.dto';

export interface VersionedUpsertOptions {
  eventId?: string;
  expectedVersion?: number;
}

export interface IOrderReadModelRepository {
  findById(orderId: string): Promise<OrderWithItemsReadModelDto | null>;

  findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<OrderReadModelDto[]>;

  findRecent(limit: number): Promise<OrderReadModelDto[]>;

  findByStatus(
    status: string,
    options?: { limit?: number; offset?: number }
  ): Promise<OrderReadModelDto[]>;

  upsert(
    order: Omit<OrderReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean>;

  saveItem(item: OrderItemReadModelDto): Promise<void>;

  delete(orderId: string): Promise<void>;

  getVersion(orderId: string): Promise<number>;

  isEventProcessed(orderId: string, eventId: string): Promise<boolean>;
}

export const ORDER_READ_MODEL_REPOSITORY = Symbol('IOrderReadModelRepository');
