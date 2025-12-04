import { Injectable, Inject } from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
  BaseProjection,
  ProjectionConfig,
  EventPayload,
} from '@flexobo/core';
import {
  IChatMessageRepository,
  CHAT_MESSAGE_REPOSITORY,
  ChatMessageReadModelDto,
  MessageType,
  SenderType,
  MessageStatus,
} from '../../../ports';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../../domain/events/event.constants';

// ============================================================
// Typed Event Data Interfaces
// ============================================================

interface MessageSentData {
  roomId: string;
  senderId: string;
  senderType: string;
  messageType: string;
  content?: string;
  fileUrls?: string[];
  fileName?: string;
  fileMetadata?: Record<string, unknown>;
  voiceDuration?: number;
  replyToId?: string;
  sentAt: Date;
}

interface MessageEditedData {
  previousContent: string;
  newContent: string;
  editedBy: string;
  editedAt: Date;
}

interface MessageDeletedData {
  deletedBy: string;
  deletedAt: Date;
}

interface MessageReadData {
  readBy: string;
  readAt: Date;
}

interface TranslationAddedData {
  language: string;
  translatedContent: string;
  translatedAt: Date;
}

// Union type for all message event data
type ChatMessageEventData =
  | MessageSentData
  | MessageEditedData
  | MessageDeletedData
  | MessageReadData
  | TranslationAddedData;

// Typed event payload
type ChatMessageEventPayload = EventPayload<ChatMessageEventData>;

@Injectable()
export class ChatMessageProjection extends BaseProjection<
  ChatMessageReadModelDto,
  ChatMessageEventPayload
> {
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer
  ) {
    super(rabbitMQConsumer, ChatMessageProjection.name);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: QUEUES.CHAT_MESSAGE.PROJECTION,
      routingKeys: [ROUTING_KEYS.CHAT.MESSAGE.ALL],
      durable: true,
      prefetchCount: 20,
      maxRetries: 10,
    };
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as ChatMessageEventPayload;

    this.logger.debug(
      `[Projection] ChatMessage event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case EVENT_TYPES.CHAT.MESSAGE.SENT:
        await this.onMessageSent(payload as EventPayload<MessageSentData>);
        break;

      case EVENT_TYPES.CHAT.MESSAGE.EDITED:
        await this.onMessageEdited(payload as EventPayload<MessageEditedData>);
        break;

      case EVENT_TYPES.CHAT.MESSAGE.DELETED:
        await this.onMessageDeleted(
          payload as EventPayload<MessageDeletedData>
        );
        break;

      case EVENT_TYPES.CHAT.MESSAGE.MARKED_AS_READ:
        await this.onMessageMarkedAsRead(
          payload as EventPayload<MessageReadData>
        );
        break;

      case EVENT_TYPES.CHAT.MESSAGE.TRANSLATION_ADDED:
        await this.onTranslationAdded(
          payload as EventPayload<TranslationAddedData>
        );
        break;

      default:
        this.logger.warn(`Unknown chat message event type: ${payload.type}`);
    }
  }

  private async onMessageSent(
    event: EventPayload<MessageSentData>
  ): Promise<void> {
    const existingMessage = await this.messageRepository.findById(
      event.aggregateId
    );
    this.checkCreateIdempotency(existingMessage, event);

    const { data } = event;
    await this.messageRepository.create({
      id: event.aggregateId,
      roomId: data.roomId,
      senderId: data.senderId,
      senderType: data.senderType as SenderType,
      type: (data.messageType as MessageType) ?? MessageType.Text,
      content: data.content,
      fileUrls: data.fileUrls ?? [],
      fileName: data.fileName,
      voiceDuration: data.voiceDuration,
      replyToId: data.replyToId,
      status: MessageStatus.Sent,
      isRead: false,
      isDeleted: false,
      translations: [],
      editHistory: [],
      version: event.version,
    });
  }

  private async onMessageEdited(
    event: EventPayload<MessageEditedData>
  ): Promise<void> {
    const existingMessage = await this.messageRepository.findById(
      event.aggregateId
    );
    const message = this.checkVersion(existingMessage, event);

    const { newContent, previousContent, editedBy } = event.data;

    // Add to edit history
    const editHistory = [
      ...message.editHistory,
      {
        previousContent,
        editedAt: new Date(event.occurredAt),
        editedBy,
      },
    ];

    await this.messageRepository.update(event.aggregateId, {
      content: newContent,
      editHistory,
      version: event.version,
    });
  }

  private async onMessageDeleted(
    event: EventPayload<MessageDeletedData>
  ): Promise<void> {
    const existingMessage = await this.messageRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingMessage, event);

    await this.messageRepository.softDelete(event.aggregateId);
  }

  private async onMessageMarkedAsRead(
    event: EventPayload<MessageReadData>
  ): Promise<void> {
    const existingMessage = await this.messageRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingMessage, event);

    await this.messageRepository.markAsRead(
      event.aggregateId,
      new Date(event.occurredAt)
    );
  }

  private async onTranslationAdded(
    event: EventPayload<TranslationAddedData>
  ): Promise<void> {
    const existingMessage = await this.messageRepository.findById(
      event.aggregateId
    );
    const message = this.checkVersion(existingMessage, event);

    const { language, translatedContent } = event.data;
    const translatedAt = new Date(event.occurredAt);

    // Check if translation for this language already exists
    const existingIndex = message.translations.findIndex(
      (t) => t.language === language
    );

    const newTranslations = [...message.translations];
    if (existingIndex >= 0) {
      newTranslations[existingIndex] = {
        language,
        content: translatedContent,
        translatedAt,
      };
    } else {
      newTranslations.push({
        language,
        content: translatedContent,
        translatedAt,
      });
    }

    await this.messageRepository.update(event.aggregateId, {
      translations: newTranslations,
      version: event.version,
    });
  }
}
