import { Injectable } from '@nestjs/common';
import { GenericAggregateStore, EventSourcedAggregate } from '@flexobo/core';
import {
  FileAggregate,
  FileSnapshotData,
} from '../../domain/aggregates/file.aggregate';
import { IFileAggregateStore } from '../../ports/file-store.port';

@Injectable()
export class FileAggregateStore
  extends GenericAggregateStore<FileAggregate, FileSnapshotData>
  implements IFileAggregateStore
{
  protected readonly aggregateType = 'File';
  protected readonly aggregateClass: EventSourcedAggregate<FileAggregate, FileSnapshotData> = FileAggregate;
}
