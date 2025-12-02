import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  AggregateStore,
  AggregateRestorer,
  IEventStore,
  OutboxService,
  SnapshotService,
  DomainEvent,
} from '@flexobo/core';
import {
  FileAggregate,
  FileSnapshotData,
} from '../../domain/aggregates/file.aggregate';
import { IFileAggregateStore } from '../../ports/file-store.port';

/**
 * File Aggregate Store
 *
 * Handles loading/saving File aggregates to event store.
 * Publishes events to broker via outbox pattern.
 */
@Injectable()
export class FileAggregateStore
  extends AggregateStore<FileAggregate, FileSnapshotData>
  implements IFileAggregateStore
{
  constructor(
    @Inject('IEventStore') eventStore: IEventStore,
    outboxService: OutboxService,
    @Optional() snapshotService?: SnapshotService
  ) {
    super(eventStore, outboxService, snapshotService);
  }

  protected getAggregateType(): string {
    return 'File';
  }

  protected getAggregateRestorer(): AggregateRestorer<
    FileAggregate,
    FileSnapshotData
  > {
    return {
      fromSnapshot(
        snapshotData: FileSnapshotData,
        snapshotVersion: number,
        subsequentEvents: DomainEvent[]
      ): FileAggregate {
        return FileAggregate.fromSnapshot(
          snapshotData,
          snapshotVersion,
          subsequentEvents
        );
      },

      fromEvents(events: DomainEvent[]): FileAggregate {
        return FileAggregate.fromEvents(events);
      },
    };
  }
}
