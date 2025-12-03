import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { Board } from '../../domain/aggregates/board.aggregate';

@Injectable()
export class BoardAggregateStore extends AggregateStore<Board, never> {
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'Board';
  }

  protected getAggregateRestorer(): AggregateRestorer<Board, never> {
    return {
      fromSnapshot(): Board {
        throw new Error('Snapshots not implemented for Board');
      },

      fromEvents(events: DomainEvent[]): Board {
        return Board.fromEvents(events);
      },
    };
  }
}
