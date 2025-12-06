import { Injectable } from '@nestjs/common';
import { GenericAggregateStore, EventSourcedAggregate } from '@flexobo/core';
import { NotificationAggregate, NotificationSnapshotData } from '../../domain/aggregates/notification.aggregate';

@Injectable()
export class NotificationAggregateStore extends GenericAggregateStore<NotificationAggregate, NotificationSnapshotData> {
  protected readonly aggregateType = 'Notification';
  protected readonly aggregateClass: EventSourcedAggregate<NotificationAggregate, NotificationSnapshotData> = NotificationAggregate;
}
