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
  BOARD_EVENT_TYPES,
  BoardCreatedEventData,
  BoardMemberAddedEventData,
  BoardMemberRemovedEventData,
} from '../../../domain/events/board.events';

type BoardEventPayload = EventPayload<
  | BoardCreatedEventData
  | BoardMemberAddedEventData
  | BoardMemberRemovedEventData
  | Record<string, unknown>
>;

export const BOARD_NOTIFICATION_RESOLVER = Symbol('BOARD_NOTIFICATION_RESOLVER');

@Injectable()
export class BoardNotificationResolver
  implements INotificationResolver<BoardEventPayload>
{
  resolve(event: BoardEventPayload): NotificationIntent | null {
    switch (event.type) {
      case BOARD_EVENT_TYPES.MEMBER_ADDED:
        return this.onMemberAdded(event as EventPayload<BoardMemberAddedEventData>);
      case BOARD_EVENT_TYPES.MEMBER_REMOVED:
        return this.onMemberRemoved(event as EventPayload<BoardMemberRemovedEventData>);
      case BOARD_EVENT_TYPES.CREATED:
      case BOARD_EVENT_TYPES.UPDATED:
      case BOARD_EVENT_TYPES.DELETED:
        return null;
      default:
        return null;
    }
  }

  private onMemberAdded(
    event: EventPayload<BoardMemberAddedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [data.userId],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Info,
        title: 'Added to Board',
        body: `You have been added to a board as ${data.role}`,
        data: {
          boardId: event.aggregateId,
          role: data.role,
          addedBy: data.addedBy,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onMemberRemoved(
    event: EventPayload<BoardMemberRemovedEventData>
  ): NotificationIntent {
    const { data } = event;
    return {
      target: NotificationTarget.User,
      userIds: [data.userId],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Warning,
        title: 'Removed from Board',
        body: 'You have been removed from a board',
        data: {
          boardId: event.aggregateId,
          removedBy: data.removedBy,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }
}
