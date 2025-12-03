import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';

import {
  TransportType,
  TransportTypeSnapshot,
} from '../../domain/transport-type.aggregate';
import { ITransportTypeAggregateStore } from '../../ports/transport-type-store.port';

@Injectable()
export class TransportTypeAggregateStore
  extends AggregateStore<TransportType, TransportTypeSnapshot>
  implements ITransportTypeAggregateStore
{
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'TransportType';
  }

  protected getAggregateRestorer(): AggregateRestorer<
    TransportType,
    TransportTypeSnapshot
  > {
    return {
      fromSnapshot(
        snapshotData: TransportTypeSnapshot,
        snapshotVersion: number,
        subsequentEvents: DomainEvent[]
      ): TransportType {
        return TransportType.fromSnapshot(
          snapshotData,
          snapshotVersion,
          subsequentEvents
        );
      },

      fromEvents(events: DomainEvent[]): TransportType {
        return TransportType.fromEvents(events);
      },
    };
  }
}
