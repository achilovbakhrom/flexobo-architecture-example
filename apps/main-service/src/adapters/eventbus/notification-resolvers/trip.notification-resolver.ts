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
  TRIP_EVENT_TYPES,
  TripCreatedEventData,
  TripStatusChangedEventData,
} from '../../../domain/events/trip.events';

type TripEventPayload = EventPayload<
  | TripCreatedEventData
  | TripStatusChangedEventData
  | Record<string, unknown>
>;

export const TRIP_NOTIFICATION_RESOLVER = Symbol('TRIP_NOTIFICATION_RESOLVER');

@Injectable()
export class TripNotificationResolver
  implements INotificationResolver<TripEventPayload>
{
  resolve(event: TripEventPayload): NotificationIntent | null {
    switch (event.type) {
      case TRIP_EVENT_TYPES.CREATED:
        return this.onTripCreated(event as EventPayload<TripCreatedEventData>);
      case TRIP_EVENT_TYPES.STATUS_CHANGED:
        return this.onTripStatusChanged(event as EventPayload<TripStatusChangedEventData>);
      case TRIP_EVENT_TYPES.UPDATED:
      case TRIP_EVENT_TYPES.DELETED:
        return null;
      default:
        return null;
    }
  }

  private onTripCreated(
    event: EventPayload<TripCreatedEventData>
  ): NotificationIntent {
    const { data } = event;
    const firstLoading = data.loadingPoints[0];
    const lastUnloading = data.unloadingPoints[data.unloadingPoints.length - 1];

    return {
      target: NotificationTarget.User,
      userIds: [data.ownerId],
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Trip,
        severity: NotificationSeverity.Success,
        title: 'Trip Posted',
        body: `Your trip from ${firstLoading?.city || 'origin'} to ${lastUnloading?.city || 'destination'} has been posted`,
        data: {
          tripId: event.aggregateId,
          transport: data.transport,
          loadingPoints: data.loadingPoints,
          unloadingPoints: data.unloadingPoints,
          price: data.price,
          currency: data.currency,
          isPublic: data.isPublic,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onTripStatusChanged(
    event: EventPayload<TripStatusChangedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Trip,
        severity: NotificationSeverity.Info,
        title: 'Trip Status Updated',
        body: `Trip status changed to ${data.newStatus}`,
        data: {
          tripId: event.aggregateId,
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
