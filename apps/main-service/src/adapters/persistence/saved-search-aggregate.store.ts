import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { SavedSearch } from '../../domain/aggregates/saved-search.aggregate';

@Injectable()
export class SavedSearchAggregateStore extends AggregateStore<SavedSearch, never> {
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'SavedSearch';
  }

  protected getAggregateRestorer(): AggregateRestorer<SavedSearch, never> {
    return {
      fromSnapshot(): SavedSearch {
        throw new Error('Snapshots not implemented for SavedSearch');
      },

      fromEvents(events: DomainEvent[]): SavedSearch {
        return SavedSearch.fromEvents(events);
      },
    };
  }
}
