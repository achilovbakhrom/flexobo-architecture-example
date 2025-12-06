import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import { Company } from '../../domain/aggregates/company.aggregate';

@Injectable()
export class CompanyAggregateStore extends AggregateStore<Company, never> {
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'Company';
  }

  protected getAggregateRestorer(): AggregateRestorer<Company, never> {
    return {
      fromSnapshot(): Company {
        throw new Error('Snapshots not implemented for Company');
      },

      fromEvents(events: DomainEvent[]): Company {
        return Company.fromEvents(events);
      },
    };
  }
}
