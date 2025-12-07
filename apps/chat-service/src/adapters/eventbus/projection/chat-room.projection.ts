import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  MESSAGE_PUBLISHER,
  IMessagePublisher,
  IncomingMessage,
  BaseProjection,
  ProjectionConfig,
  EventPayload,
  IEventBuffer,
  EVENT_BUFFER,
  INotificationResolver,
} from '@flexobo/core';
import {
  IChatRoomRepository,
  CHAT_ROOM_REPOSITORY,
  ChatRoomStatus,
  ChatRoomReadModelDto,
} from '../../../ports';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../../domain/events/event.constants';
import { CHAT_ROOM_NOTIFICATION_RESOLVER } from '../notification-resolvers';

interface RoomCreatedData {
  participants: string[];
  isGroup: boolean;
  groupName?: string;
  isSupportChat: boolean;
  identifierId?: string;
  identifierType?: string;
  createdBy: string;
}

interface ParticipantAddedData {
  userId: string;
  addedBy: string;
  addedAt: Date;
}

interface ParticipantRemovedData {
  userId: string;
  removedBy: string;
  removedAt: Date;
}

interface MessageAddedData {
  messageId: string;
  senderId: string;
  preview: string;
  sentAt: Date;
}

interface UnreadCountUpdatedData {
  userId: string;
  count: number;
  updatedAt: Date;
}

interface TranslationSettingsUpdatedData {
  userId: string;
  settings: {
    enabled: boolean;
    targetLanguage: string;
  };
  updatedAt: Date;
}

interface RoomArchivedData {
  archivedBy: string;
  archivedAt: Date;
}

interface RoomDeletedData {
  deletedBy: string;
  deletedAt: Date;
}

// Union type for all room event data
type ChatRoomEventData =
  | RoomCreatedData
  | ParticipantAddedData
  | ParticipantRemovedData
  | MessageAddedData
  | UnreadCountUpdatedData
  | TranslationSettingsUpdatedData
  | RoomArchivedData
  | RoomDeletedData;

// Typed event payload
type ChatRoomEventPayload = EventPayload<ChatRoomEventData>;

@Injectable()
export class ChatRoomProjection extends BaseProjection<ChatRoomReadModelDto, ChatRoomEventPayload> {
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null,
    @Optional()
    @Inject(MESSAGE_PUBLISHER)
    messagePublisher: IMessagePublisher | null,
    @Optional()
    @Inject(CHAT_ROOM_NOTIFICATION_RESOLVER)
    notificationResolver: INotificationResolver<ChatRoomEventPayload> | null
  ) {
    super(rabbitMQConsumer, ChatRoomProjection.name, eventBuffer, messagePublisher, notificationResolver);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: QUEUES.CHAT_ROOM.PROJECTION,
      routingKeys: [ROUTING_KEYS.CHAT.ROOM.ALL],
      durable: true,
      maxRetries: 3,
      prefetchCount: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(aggregateId: string): Promise<number> {
    const entity = await this.roomRepository.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(event: ChatRoomEventPayload): Promise<void> {
    switch (event.type) {
      case EVENT_TYPES.CHAT.ROOM.CREATED:
        await this.onRoomCreated(event as EventPayload<RoomCreatedData>);
        break;
      case EVENT_TYPES.CHAT.ROOM.PARTICIPANT_ADDED:
        await this.onParticipantAdded(event as EventPayload<ParticipantAddedData>);
        break;
      case EVENT_TYPES.CHAT.ROOM.PARTICIPANT_REMOVED:
        await this.onParticipantRemoved(event as EventPayload<ParticipantRemovedData>);
        break;
      case EVENT_TYPES.CHAT.ROOM.MESSAGE_ADDED:
        await this.onMessageAdded(event as EventPayload<MessageAddedData>);
        break;
      case EVENT_TYPES.CHAT.ROOM.MARKED_AS_READ:
        await this.onRoomMarkedAsRead(event as EventPayload<UnreadCountUpdatedData>);
        break;
      case EVENT_TYPES.CHAT.ROOM.ARCHIVED:
        await this.onRoomArchived(event as EventPayload<RoomArchivedData>);
        break;
      case EVENT_TYPES.CHAT.ROOM.DELETED:
        await this.onRoomDeleted(event as EventPayload<RoomDeletedData>);
        break;
      case EVENT_TYPES.CHAT.ROOM.TRANSLATION_SETTINGS_UPDATED:
        await this.onTranslationSettingsUpdated(event as EventPayload<TranslationSettingsUpdatedData>);
        break;
      default:
        this.logger.warn(`Unknown chat room event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as ChatRoomEventPayload;
    await this.applyEvent(payload);
  }

  private async onRoomCreated(event: EventPayload<RoomCreatedData>): Promise<void> {
    const existingRoom = await this.roomRepository.findById(event.aggregateId);
    this.checkCreateIdempotency(existingRoom, event);

    const { data } = event;
    await this.roomRepository.create({
      id: event.aggregateId,
      participants: data.participants,
      isGroup: data.isGroup ?? false,
      groupName: data.groupName,
      isSupportChat: data.isSupportChat ?? false,
      status: ChatRoomStatus.Active,
      unreadCounts: {},
      translationSettings: {},
      lastMessagePreview: undefined,
      lastMessageAt: new Date(),
      identifierId: data.identifierId,
      identifierType: data.identifierType,
      isDeleted: false,
      version: event.version,
    });
  }

  private async onParticipantAdded(event: EventPayload<ParticipantAddedData>): Promise<void> {
    const existingRoom = await this.roomRepository.findById(event.aggregateId);
    const room = this.checkVersion(existingRoom, event);

    const { userId } = event.data;
    const newParticipants = [...room.participants, userId];

    await this.roomRepository.update(event.aggregateId, {
      participants: newParticipants,
      version: event.version,
    });
  }

  private async onParticipantRemoved(event: EventPayload<ParticipantRemovedData>): Promise<void> {
    const existingRoom = await this.roomRepository.findById(event.aggregateId);
    const room = this.checkVersion(existingRoom, event);

    const { userId } = event.data;
    const newParticipants = room.participants.filter(p => p !== userId);

    await this.roomRepository.update(event.aggregateId, {
      participants: newParticipants,
      version: event.version,
    });
  }

  private async onMessageAdded(event: EventPayload<MessageAddedData>): Promise<void> {
    const existingRoom = await this.roomRepository.findById(event.aggregateId);
    const room = this.checkVersion(existingRoom, event);

    const { messageId, senderId, preview } = event.data;

    // Increment unread counts for all participants except sender
    const newUnreadCounts = { ...room.unreadCounts };
    for (const participantId of room.participants) {
      if (participantId !== senderId) {
        newUnreadCounts[participantId] = (newUnreadCounts[participantId] || 0) + 1;
      }
    }

    await this.roomRepository.update(event.aggregateId, {
      lastMessageId: messageId,
      lastMessagePreview: preview?.substring(0, 100),
      lastMessageAt: new Date(event.occurredAt),
      unreadCounts: newUnreadCounts,
      version: event.version,
    });
  }

  private async onRoomMarkedAsRead(event: EventPayload<UnreadCountUpdatedData>): Promise<void> {
    const existingRoom = await this.roomRepository.findById(event.aggregateId);
    const room = this.checkVersion(existingRoom, event);

    const { userId } = event.data;
    const newUnreadCounts = { ...room.unreadCounts };
    newUnreadCounts[userId] = 0;

    await this.roomRepository.update(event.aggregateId, {
      unreadCounts: newUnreadCounts,
      version: event.version,
    });
  }

  private async onRoomArchived(event: EventPayload<RoomArchivedData>): Promise<void> {
    const existingRoom = await this.roomRepository.findById(event.aggregateId);
    this.checkVersion(existingRoom, event);

    await this.roomRepository.update(event.aggregateId, {
      status: ChatRoomStatus.Archived,
      version: event.version,
    });
  }

  private async onRoomDeleted(event: EventPayload<RoomDeletedData>): Promise<void> {
    const existingRoom = await this.roomRepository.findById(event.aggregateId);
    this.checkVersion(existingRoom, event);

    await this.roomRepository.softDelete(event.aggregateId);
  }

  private async onTranslationSettingsUpdated(event: EventPayload<TranslationSettingsUpdatedData>): Promise<void> {
    const existingRoom = await this.roomRepository.findById(event.aggregateId);
    const room = this.checkVersion(existingRoom, event);

    const { userId, settings } = event.data;
    const newTranslationSettings = { ...room.translationSettings };

    if (settings.enabled) {
      newTranslationSettings[userId] = { enabled: true, targetLanguage: settings.targetLanguage };
    } else {
      delete newTranslationSettings[userId];
    }

    await this.roomRepository.update(event.aggregateId, {
      translationSettings: newTranslationSettings,
      version: event.version,
    });
  }
}
