import { StoredEventDto } from '../application/dto/order.dto';

export interface IOrderEventRepository {
  getEvents(orderId: string): Promise<StoredEventDto[]>;

  appendEvents(
    orderId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void>;

  exists(orderId: string): Promise<boolean>;
}

export const ORDER_EVENT_REPOSITORY = Symbol('IOrderEventRepository');
