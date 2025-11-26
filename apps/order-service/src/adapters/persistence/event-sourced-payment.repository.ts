/**
 * Event-Sourced Payment Repository (Adapter)
 *
 * Implements IPaymentEventRepository for event sourcing.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IEventStore } from '@flexobo/core';
import {
  IPaymentEventRepository,
  PAYMENT_EVENT_REPOSITORY,
} from '../../ports/payment.repository.port';
import { PaymentStoredEventDto } from '../../application/dto/payment.dto';

@Injectable()
export class EventSourcedPaymentRepository implements IPaymentEventRepository {
  constructor(
    @Inject('IEventStore') private readonly eventStore: IEventStore
  ) {}

  async getEvents(paymentId: string): Promise<PaymentStoredEventDto[]> {
    const storedEvents = await this.eventStore.getEvents(paymentId);

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
    paymentId: string,
    events: Array<{
      type: string;
      data: Record<string, unknown>;
      aggregateType: string;
    }>,
    expectedVersion: number
  ): Promise<void> {
    const domainEvents = events.map((event, index) => ({
      type: event.type,
      aggregateId: paymentId,
      aggregateType: event.aggregateType,
      version: expectedVersion + index + 1,
      occurredAt: new Date(),
      data: event.data,
    }));

    await this.eventStore.append(paymentId, domainEvents, expectedVersion);
  }

  async exists(paymentId: string): Promise<boolean> {
    const storedEvents = await this.eventStore.getEvents(paymentId);
    return storedEvents.length > 0;
  }
}

export { PAYMENT_EVENT_REPOSITORY };
