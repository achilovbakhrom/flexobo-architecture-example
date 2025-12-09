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

interface MessageSentData {
  roomId: string;
  senderId: string;
  senderType: string;
  messageType: string;
  content?: string;
  recipientIds?: string[];
}

type ChatMessageEventPayload = EventPayload<MessageSentData | Record<string, unknown>>;

export const CHAT_MESSAGE_NOTIFICATION_RESOLVER = Symbol('CHAT_MESSAGE_NOTIFICATION_RESOLVER');

@Injectable()
export class ChatMessageNotificationResolver
  implements INotificationResolver<ChatMessageEventPayload>
{
  resolve(event: ChatMessageEventPayload): NotificationIntent | null {
    switch (event.type) {
      case EVENT_TYPES.CHAT.MESSAGE.SENT:
        return this.onMessageSent(event as EventPayload<MessageSentData>);
      case EVENT_TYPES.CHAT.MESSAGE.EDITED:
      case EVENT_TYPES.CHAT.MESSAGE.DELETED:
      case EVENT_TYPES.CHAT.MESSAGE.MARKED_AS_READ:
      case EVENT_TYPES.CHAT.MESSAGE.TRANSLATION_ADDED:
        // These events don't need notifications
        return null;
      default:
        return null;
    }
  }

  private onMessageSent(event: EventPayload<MessageSentData>): NotificationIntent | null {
    const { data } = event;

    // If no recipient IDs are provided in the event, we can't notify
    // The projection will handle room-level notifications via SSE
    if (!data.recipientIds || data.recipientIds.length === 0) {
      return null;
    }

    // Don't notify the sender
    const recipientIds = data.recipientIds.filter(id => id !== data.senderId);

    if (recipientIds.length === 0) {
      return null;
    }

    const messagePreview = data.content
      ? data.content.substring(0, 50) + (data.content.length > 50 ? '...' : '')
      : this.getMessageTypeLabel(data.messageType);

    return {
      target: NotificationTarget.User,
      userIds: recipientIds,
      channels: [NotificationChannel.Sse, NotificationChannel.Push],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.Chat,
        severity: NotificationSeverity.Info,
        title: 'New message',
        body: messagePreview,
        data: {
          messageId: event.aggregateId,
          roomId: data.roomId,
          senderId: data.senderId,
          messageType: data.messageType,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private getMessageTypeLabel(messageType: string): string {
    switch (messageType) {
      case 'image':
        return 'Sent an image';
      case 'file':
        return 'Sent a file';
      case 'voice':
        return 'Sent a voice message';
      case 'video':
        return 'Sent a video';
      default:
        return 'Sent a message';
    }
  }
}
