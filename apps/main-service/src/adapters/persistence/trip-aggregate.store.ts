import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { Trip } from '../../domain/aggregates/trip.aggregate';

@Injectable()
export class TripAggregateStore extends AggregateStore<Trip, never> {
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'Trip';
  }

  protected getAggregateRestorer(): AggregateRestorer<Trip, never> {
    return {
      fromSnapshot(): Trip {
        throw new Error('Snapshots not implemented for Trip');
      },

      fromEvents(events: DomainEvent[]): Trip {
        return Trip.fromEvents(events);
      },
    };
  }
}
