/**
 * Event-Sourced Inventory Repository (Adapter)
 *
 * Implements the IInventoryEventRepository port using Prisma and event store.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IEventStore } from '@flexobo/core';
import {
  IInventoryEventRepository,
  StoredEventDto,
} from '../../ports/inventory.repository.port';

@Injectable()
export class EventSourcedInventoryRepository
  implements IInventoryEventRepository
{
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async getEvents(inventoryId: string): Promise<StoredEventDto[]> {
    const storedEvents = await this.eventStore.getEvents(inventoryId);

    return storedEvents.map((event) => ({
      id: event.id || '',
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      eventData: event.eventData,
      version: event.version,
      occurredAt: event.occurredAt,
      metadata: event.metadata,
    }));
  }

  async appendEvents(
    inventoryId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void> {
    const domainEvents = events.map((event, index) => ({
      type: event.type,
      aggregateId: inventoryId,
      aggregateType: event.aggregateType,
      version: expectedVersion + index + 1,
      occurredAt: new Date(),
      data: event.data,
    }));

    await this.eventStore.append(inventoryId, domainEvents, expectedVersion);
  }

  async exists(inventoryId: string): Promise<boolean> {
    const storedEvents = await this.eventStore.getEvents(inventoryId);
    return storedEvents.length > 0;
  }

  async findByProductId(productId: string): Promise<StoredEventDto[] | null> {
    // Get all Inventory events and find the one with matching productId
    const events = await this.eventStore.getEventsByAggregateType(
      'Inventory',
      1000,
      0
    );

    // Group events by aggregateId
    const eventsByAggregate = new Map<string, StoredEventDto[]>();
    for (const event of events) {
      const stored: StoredEventDto = {
        id: event.id || '',
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        eventData: event.eventData,
        version: event.version,
        occurredAt: event.occurredAt,
        metadata: event.metadata,
      };

      const existing = eventsByAggregate.get(event.aggregateId) || [];
      existing.push(stored);
      eventsByAggregate.set(event.aggregateId, existing);
    }

    // Find the aggregate with matching productId in InventoryItemCreated event
    for (const [, aggregateEvents] of eventsByAggregate) {
      const createdEvent = aggregateEvents.find(
        (e) => e.eventType === 'InventoryItemCreated'
      );
      if (createdEvent && createdEvent.eventData['productId'] === productId) {
        return aggregateEvents.sort((a, b) => a.version - b.version);
      }
    }

    return null;
  }

  async findBySku(sku: string): Promise<StoredEventDto[] | null> {
    // Get all Inventory events and find the one with matching sku
    const events = await this.eventStore.getEventsByAggregateType(
      'Inventory',
      1000,
      0
    );

    // Group events by aggregateId
    const eventsByAggregate = new Map<string, StoredEventDto[]>();
    for (const event of events) {
      const stored: StoredEventDto = {
        id: event.id || '',
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        eventData: event.eventData,
        version: event.version,
        occurredAt: event.occurredAt,
        metadata: event.metadata,
      };

      const existing = eventsByAggregate.get(event.aggregateId) || [];
      existing.push(stored);
      eventsByAggregate.set(event.aggregateId, existing);
    }

    // Find the aggregate with matching sku in InventoryItemCreated event
    for (const [, aggregateEvents] of eventsByAggregate) {
      const createdEvent = aggregateEvents.find(
        (e) => e.eventType === 'InventoryItemCreated'
      );
      if (createdEvent && createdEvent.eventData['sku'] === sku) {
        return aggregateEvents.sort((a, b) => a.version - b.version);
      }
    }

    return null;
  }
}
