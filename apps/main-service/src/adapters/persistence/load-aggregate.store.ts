import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { Load } from '../../domain/aggregates/load.aggregate';

@Injectable()
export class LoadAggregateStore extends AggregateStore<Load, never> {
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'Load';
  }

  protected getAggregateRestorer(): AggregateRestorer<Load, never> {
    return {
      fromSnapshot(): Load {
        throw new Error('Snapshots not implemented for Load');
      },

      fromEvents(events: DomainEvent[]): Load {
        return Load.fromEvents(events);
      },
    };
  }
}
