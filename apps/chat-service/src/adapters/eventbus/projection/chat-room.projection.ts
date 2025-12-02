import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
} from '@flexobo/core';
import {
  IChatRoomRepository,
  CHAT_ROOM_REPOSITORY,
  ChatRoomStatus,
} from '../../../ports';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../../domain/events/event.constants';

interface ChatRoomEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ChatRoomProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatRoomProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.CHAT_ROOM.PROJECTION);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      this.logger.warn('RabbitMQ is not connected. Skipping chat room projection subscription.');
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.CHAT_ROOM.PROJECTION,
      [ROUTING_KEYS.CHAT.ROOM.ALL],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.CHAT_ROOM.PROJECTION}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as ChatRoomEventPayload;

    this.logger.debug(
      `[Projection] ChatRoom event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case EVENT_TYPES.CHAT.ROOM.CREATED:
        await this.onRoomCreated(payload);
        break;

      case EVENT_TYPES.CHAT.ROOM.PARTICIPANT_ADDED:
        await this.onParticipantAdded(payload);
        break;

      case EVENT_TYPES.CHAT.ROOM.PARTICIPANT_REMOVED:
        await this.onParticipantRemoved(payload);
        break;

      case EVENT_TYPES.CHAT.ROOM.MESSAGE_ADDED:
        await this.onMessageAdded(payload);
        break;

      case EVENT_TYPES.CHAT.ROOM.MARKED_AS_READ:
        await this.onRoomMarkedAsRead(payload);
        break;

      case EVENT_TYPES.CHAT.ROOM.ARCHIVED:
        await this.onRoomArchived(payload);
        break;

      case EVENT_TYPES.CHAT.ROOM.DELETED:
        await this.onRoomDeleted(payload);
        break;

      case EVENT_TYPES.CHAT.ROOM.TRANSLATION_SETTINGS_UPDATED:
        await this.onTranslationSettingsUpdated(payload);
        break;

      default:
        this.logger.warn(`Unknown chat room event type: ${payload.type}`);
    }
  }

  private async onRoomCreated(event: ChatRoomEventPayload): Promise<void> {
    await this.roomRepository.create({
      id: event.aggregateId,
      participants: event.data['participants'] as string[],
      isGroup: (event.data['isGroup'] as boolean) ?? false,
      groupName: event.data['groupName'] as string | undefined,
      isSupportChat: (event.data['isSupportChat'] as boolean) ?? false,
      status: ChatRoomStatus.ACTIVE,
      unreadCounts: {},
      translationSettings: {},
      lastMessagePreview: undefined,
      lastMessageAt: new Date(),
      identifierId: event.data['identifierId'] as string | undefined,
      identifierType: event.data['identifierType'] as string | undefined,
      isDeleted: false,
      version: event.version,
    });
  }

  private async onParticipantAdded(event: ChatRoomEventPayload): Promise<void> {
    const room = await this.roomRepository.findById(event.aggregateId);
    if (!room) return;

    const participantId = event.data['participantId'] as string;
    const newParticipants = [...room.participants, participantId];

    await this.roomRepository.update(event.aggregateId, {
      participants: newParticipants,
      version: event.version,
    });
  }

  private async onParticipantRemoved(event: ChatRoomEventPayload): Promise<void> {
    const room = await this.roomRepository.findById(event.aggregateId);
    if (!room) return;

    const participantId = event.data['participantId'] as string;
    const newParticipants = room.participants.filter(p => p !== participantId);

    await this.roomRepository.update(event.aggregateId, {
      participants: newParticipants,
      version: event.version,
    });
  }

  private async onMessageAdded(event: ChatRoomEventPayload): Promise<void> {
    const senderId = event.data['senderId'] as string;
    const content = event.data['content'] as string | undefined;
    const messageId = event.data['messageId'] as string;

    const room = await this.roomRepository.findById(event.aggregateId);
    if (!room) return;

    // Increment unread counts for all participants except sender
    const newUnreadCounts = { ...room.unreadCounts };
    for (const participantId of room.participants) {
      if (participantId !== senderId) {
        newUnreadCounts[participantId] = (newUnreadCounts[participantId] || 0) + 1;
      }
    }

    await this.roomRepository.update(event.aggregateId, {
      lastMessageId: messageId,
      lastMessagePreview: content?.substring(0, 100),
      lastMessageAt: new Date(event.occurredAt),
      unreadCounts: newUnreadCounts,
      version: event.version,
    });
  }

  private async onRoomMarkedAsRead(event: ChatRoomEventPayload): Promise<void> {
    const userId = event.data['userId'] as string;

    const room = await this.roomRepository.findById(event.aggregateId);
    if (!room) return;

    const newUnreadCounts = { ...room.unreadCounts };
    newUnreadCounts[userId] = 0;

    await this.roomRepository.update(event.aggregateId, {
      unreadCounts: newUnreadCounts,
      version: event.version,
    });
  }

  private async onRoomArchived(event: ChatRoomEventPayload): Promise<void> {
    await this.roomRepository.update(event.aggregateId, {
      status: ChatRoomStatus.ARCHIVED,
      version: event.version,
    });
  }

  private async onRoomDeleted(event: ChatRoomEventPayload): Promise<void> {
    await this.roomRepository.softDelete(event.aggregateId);
  }

  private async onTranslationSettingsUpdated(event: ChatRoomEventPayload): Promise<void> {
    const userId = event.data['userId'] as string;
    const enabled = event.data['enabled'] as boolean;
    const language = event.data['language'] as string;

    const room = await this.roomRepository.findById(event.aggregateId);
    if (!room) return;

    const newTranslationSettings = { ...room.translationSettings };
    if (enabled) {
      newTranslationSettings[userId] = { enabled: true, targetLanguage: language };
    } else {
      delete newTranslationSettings[userId];
    }

    await this.roomRepository.update(event.aggregateId, {
      translationSettings: newTranslationSettings,
      version: event.version,
    });
  }
}
