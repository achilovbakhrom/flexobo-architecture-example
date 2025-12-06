import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { Booking } from '../../domain/aggregates/booking.aggregate';

@Injectable()
export class BookingAggregateStore extends AggregateStore<Booking, never> {
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'Booking';
  }

  protected getAggregateRestorer(): AggregateRestorer<Booking, never> {
    return {
      fromSnapshot(): Booking {
        throw new Error('Snapshots not implemented for Booking');
      },

      fromEvents(events: DomainEvent[]): Booking {
        return Booking.fromEvents(events);
      },
    };
  }
}
