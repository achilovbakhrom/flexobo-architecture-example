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
import { EVENT_TYPES } from '@flexobo/shared-kernel';

interface RoomCreatedData {
  participants: string[];
  isGroup: boolean;
  groupName?: string;
  isSupportChat: boolean;
  createdBy: string;
}

interface ParticipantAddedData {
  userId: string;
  addedBy: string;
}

interface ParticipantRemovedData {
  userId: string;
  removedBy: string;
}

type ChatRoomEventPayload = EventPayload<
  RoomCreatedData | ParticipantAddedData | ParticipantRemovedData | Record<string, unknown>
>;

export const CHAT_ROOM_NOTIFICATION_RESOLVER = Symbol('CHAT_ROOM_NOTIFICATION_RESOLVER');

@Injectable()
export class ChatRoomNotificationResolver
  implements INotificationResolver<ChatRoomEventPayload>
{
  resolve(event: ChatRoomEventPayload): NotificationIntent | null {
    switch (event.type) {
      case EVENT_TYPES.CHAT.ROOM.CREATED:
        return this.onRoomCreated(event as EventPayload<RoomCreatedData>);
      case EVENT_TYPES.CHAT.ROOM.PARTICIPANT_ADDED:
        return this.onParticipantAdded(event as EventPayload<ParticipantAddedData>);
      case EVENT_TYPES.CHAT.ROOM.PARTICIPANT_REMOVED:
        return this.onParticipantRemoved(event as EventPayload<ParticipantRemovedData>);
      case EVENT_TYPES.CHAT.ROOM.MESSAGE_ADDED:
      case EVENT_TYPES.CHAT.ROOM.MARKED_AS_READ:
      case EVENT_TYPES.CHAT.ROOM.ARCHIVED:
      case EVENT_TYPES.CHAT.ROOM.DELETED:
      case EVENT_TYPES.CHAT.ROOM.TRANSLATION_SETTINGS_UPDATED:
        // These events don't need notifications or are handled elsewhere
        return null;
      default:
        return null;
    }
  }

  private onRoomCreated(event: EventPayload<RoomCreatedData>): NotificationIntent | null {
    const { data } = event;

    // Notify all participants except the creator
    const recipientIds = data.participants.filter(p => p !== data.createdBy);

    if (recipientIds.length === 0) {
      return null;
    }

    const title = data.isGroup && data.groupName
      ? `New group: ${data.groupName}`
      : 'New chat room';

    const body = data.isSupportChat
      ? 'A support chat has been started'
      : 'You have been added to a new conversation';

    return {
      target: NotificationTarget.User,
      userIds: recipientIds,
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Chat,
        severity: NotificationSeverity.Info,
        title,
        body,
        data: {
          roomId: event.aggregateId,
          isGroup: data.isGroup,
          isSupportChat: data.isSupportChat,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onParticipantAdded(event: EventPayload<ParticipantAddedData>): NotificationIntent {
    const { data } = event;

    return {
      target: NotificationTarget.User,
      userIds: [data.userId],
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Chat,
        severity: NotificationSeverity.Info,
        title: 'Added to chat',
        body: 'You have been added to a chat room',
        data: {
          roomId: event.aggregateId,
          addedBy: data.addedBy,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onParticipantRemoved(event: EventPayload<ParticipantRemovedData>): NotificationIntent {
    const { data } = event;

    return {
      target: NotificationTarget.User,
      userIds: [data.userId],
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Chat,
        severity: NotificationSeverity.Info,
        title: 'Removed from chat',
        body: 'You have been removed from a chat room',
        data: {
          roomId: event.aggregateId,
          removedBy: data.removedBy,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }
}
