import { DomainEvent } from '@flexobo/core';

export const INVENTORY_EVENT_REPOSITORY = Symbol('INVENTORY_EVENT_REPOSITORY');

export interface StoredEventDto {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: Record<string, unknown>;
  version: number;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IInventoryEventRepository {
  getEvents(inventoryId: string): Promise<StoredEventDto[]>;

  appendEvents(
    inventoryId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void>;

  exists(inventoryId: string): Promise<boolean>;

  findByProductId(productId: string): Promise<StoredEventDto[] | null>;

  findBySku(sku: string): Promise<StoredEventDto[] | null>;
}
