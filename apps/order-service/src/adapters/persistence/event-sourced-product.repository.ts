/**
 * Event-Sourced Product Repository (Adapter)
 *
 * Implements IProductEventRepository for event sourcing.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IEventStore } from '@flexobo/core';
import { IProductEventRepository } from '../../ports/product.repository.port';
import { ProductStoredEventDto } from '../../application/dto/product.dto';

@Injectable()
export class EventSourcedProductRepository implements IProductEventRepository {
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async getEvents(productId: string): Promise<ProductStoredEventDto[]> {
    const storedEvents = await this.eventStore.getEvents(productId);

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
    productId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void> {
    const domainEvents = events.map((event, index) => ({
      type: event.type,
      aggregateId: productId,
      aggregateType: event.aggregateType,
      version: expectedVersion + index + 1,
      occurredAt: new Date(),
      data: event.data,
    }));

    await this.eventStore.append(productId, domainEvents, expectedVersion);
  }

  async exists(productId: string): Promise<boolean> {
    const storedEvents = await this.eventStore.getEvents(productId);
    return storedEvents.length > 0;
  }
}
