import { Injectable } from '@nestjs/common';
import {
  INotificationResolver,
  NotificationIntent,
  NotificationTarget,
  NotificationChannel,
  NotificationType,
  NotificationCategory,
  NotificationSeverity,
  EventPayload,
} from '@flexobo/core';
import {
  LOAD_EVENT_TYPES,
  LoadCreatedEventData,
  LoadStatusChangedEventData,
} from '../../../domain/events/load.events';

type LoadEventPayload = EventPayload<
  | LoadCreatedEventData
  | LoadStatusChangedEventData
  | Record<string, unknown>
>;

export const LOAD_NOTIFICATION_RESOLVER = Symbol('LOAD_NOTIFICATION_RESOLVER');

@Injectable()
export class LoadNotificationResolver
  implements INotificationResolver<LoadEventPayload>
{
  resolve(event: LoadEventPayload): NotificationIntent | null {
    switch (event.type) {
      case LOAD_EVENT_TYPES.CREATED:
        return this.onLoadCreated(event as EventPayload<LoadCreatedEventData>);
      case LOAD_EVENT_TYPES.STATUS_CHANGED:
        return this.onLoadStatusChanged(event as EventPayload<LoadStatusChangedEventData>);
      case LOAD_EVENT_TYPES.UPDATED:
      case LOAD_EVENT_TYPES.DELETED:
        return null;
      default:
        return null;
    }
  }

  private onLoadCreated(
    event: EventPayload<LoadCreatedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [data.ownerId],
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Load,
        severity: NotificationSeverity.Success,
        title: 'Load Posted',
        body: `Your load from ${data.from.city} to ${data.to.city} has been posted`,
        data: {
          loadId: event.aggregateId,
          from: data.from,
          to: data.to,
          totalWeight: data.totalWeight,
          price: data.price,
          currency: data.currency,
          isPublic: data.isPublic,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onLoadStatusChanged(
    event: EventPayload<LoadStatusChangedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Load,
        severity: NotificationSeverity.Info,
        title: 'Load Status Updated',
        body: `Load status changed to ${data.newStatus}`,
        data: {
          loadId: event.aggregateId,
          previousStatus: data.previousStatus,
          newStatus: data.newStatus,
          changedBy: data.changedBy,
          reason: data.reason,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }
}
