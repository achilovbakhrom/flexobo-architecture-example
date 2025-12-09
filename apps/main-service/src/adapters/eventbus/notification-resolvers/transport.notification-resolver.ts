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
  TRANSPORT_EVENT_TYPES,
  TransportCreatedEventData,
} from '../../../domain/events/transport.events';

type TransportEventPayload = EventPayload<
  TransportCreatedEventData | Record<string, unknown>
>;

export const TRANSPORT_NOTIFICATION_RESOLVER = Symbol('TRANSPORT_NOTIFICATION_RESOLVER');

@Injectable()
export class TransportNotificationResolver
  implements INotificationResolver<TransportEventPayload>
{
  resolve(event: TransportEventPayload): NotificationIntent | null {
    switch (event.type) {
      case TRANSPORT_EVENT_TYPES.CREATED:
        return this.onTransportCreated(event as EventPayload<TransportCreatedEventData>);
      case TRANSPORT_EVENT_TYPES.UPDATED:
      case TRANSPORT_EVENT_TYPES.DELETED:
        return null;
      default:
        return null;
    }
  }

  private onTransportCreated(
    event: EventPayload<TransportCreatedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [data.ownerId],
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Success,
        title: 'Transport Added',
        body: `Your ${data.transportType} transport (${data.capacityTons}t) has been added`,
        data: {
          transportId: event.aggregateId,
          transportType: data.transportType,
          capacityTons: data.capacityTons,
          capacityM3: data.capacityM3,
          features: data.features,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }
}
