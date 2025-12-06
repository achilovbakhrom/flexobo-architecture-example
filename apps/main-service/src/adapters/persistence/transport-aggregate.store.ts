import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { Transport } from '../../domain/aggregates/transport.aggregate';

@Injectable()
export class TransportAggregateStore extends AggregateStore<Transport, never> {
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'Transport';
  }

  protected getAggregateRestorer(): AggregateRestorer<Transport, never> {
    return {
      fromSnapshot(): Transport {
        throw new Error('Snapshots not implemented for Transport');
      },

      fromEvents(events: DomainEvent[]): Transport {
        return Transport.fromEvents(events);
      },
    };
  }
}
