/**
 * Event-Sourced Order Repository (Adapter)
 *
 * This adapter implements the IOrderEventRepository port.
 * It uses the IEventStore from @flexobo/core to persist and load order events.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IEventStore } from '@flexobo/core';
import {
  IOrderEventRepository,
  ORDER_EVENT_REPOSITORY,
} from '../../ports/order.repository.port';
import { StoredEventDto } from '../../application/dto/order.dto';

@Injectable()
export class EventSourcedOrderRepository implements IOrderEventRepository {
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async getEvents(orderId: string): Promise<StoredEventDto[]> {
    const storedEvents = await this.eventStore.getEvents(orderId);

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
    orderId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void> {
    const domainEvents = events.map((event, index) => ({
      type: event.type,
      aggregateId: orderId,
      aggregateType: event.aggregateType,
      version: expectedVersion + index + 1,
      occurredAt: new Date(),
      data: event.data,
    }));

    await this.eventStore.append(orderId, domainEvents, expectedVersion);
  }

  async exists(orderId: string): Promise<boolean> {
    const storedEvents = await this.eventStore.getEvents(orderId);
    return storedEvents.length > 0;
  }
}

export { ORDER_EVENT_REPOSITORY };
