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
  SAVED_SEARCH_EVENT_TYPES,
  SavedSearchCreatedEventData,
} from '../../../domain/events/saved-search.events';

type SavedSearchEventPayload = EventPayload<
  SavedSearchCreatedEventData | Record<string, unknown>
>;

export const SAVED_SEARCH_NOTIFICATION_RESOLVER = Symbol('SAVED_SEARCH_NOTIFICATION_RESOLVER');

@Injectable()
export class SavedSearchNotificationResolver
  implements INotificationResolver<SavedSearchEventPayload>
{
  resolve(event: SavedSearchEventPayload): NotificationIntent | null {
    switch (event.type) {
      case SAVED_SEARCH_EVENT_TYPES.CREATED:
        return this.onSavedSearchCreated(event as EventPayload<SavedSearchCreatedEventData>);
      case SAVED_SEARCH_EVENT_TYPES.UPDATED:
      case SAVED_SEARCH_EVENT_TYPES.DELETED:
      case SAVED_SEARCH_EVENT_TYPES.USED:
        return null;
      default:
        return null;
    }
  }

  private onSavedSearchCreated(
    event: EventPayload<SavedSearchCreatedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [data.userId],
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Info,
        title: 'Search Saved',
        body: `Your search "${data.name}" has been saved${data.notifyOnNew ? ' with notifications enabled' : ''}`,
        data: {
          savedSearchId: event.aggregateId,
          name: data.name,
          searchType: data.searchType,
          notifyOnNew: data.notifyOnNew,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }
}
