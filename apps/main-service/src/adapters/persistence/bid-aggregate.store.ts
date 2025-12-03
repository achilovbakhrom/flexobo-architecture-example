import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { Bid } from '../../domain/aggregates/bid.aggregate';

@Injectable()
export class BidAggregateStore extends AggregateStore<Bid, never> {
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'Bid';
  }

  protected getAggregateRestorer(): AggregateRestorer<Bid, never> {
    return {
      fromSnapshot(): Bid {
        throw new Error('Snapshots not implemented for Bid');
      },

      fromEvents(events: DomainEvent[]): Bid {
        return Bid.fromEvents(events);
      },
    };
  }
}
