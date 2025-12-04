import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
  BaseProjection,
  ProjectionConfig,
  EventPayload,
  IEventBuffer,
  EVENT_BUFFER,
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
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null
  ) {
    super(rabbitMQConsumer, ChatMessageProjection.name, eventBuffer);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: QUEUES.CHAT_MESSAGE.PROJECTION,
      routingKeys: [ROUTING_KEYS.CHAT.MESSAGE.ALL],
      durable: true,
      prefetchCount: 20,
      maxRetries: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(aggregateId: string): Promise<number> {
    const entity = await this.messageRepository.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(event: ChatMessageEventPayload): Promise<void> {
    switch (event.type) {
      case EVENT_TYPES.CHAT.MESSAGE.SENT:
        await this.onMessageSent(event as EventPayload<MessageSentData>);
        break;
      case EVENT_TYPES.CHAT.MESSAGE.EDITED:
        await this.onMessageEdited(event as EventPayload<MessageEditedData>);
        break;
      case EVENT_TYPES.CHAT.MESSAGE.DELETED:
        await this.onMessageDeleted(event as EventPayload<MessageDeletedData>);
        break;
      case EVENT_TYPES.CHAT.MESSAGE.MARKED_AS_READ:
        await this.onMessageMarkedAsRead(event as EventPayload<MessageReadData>);
        break;
      case EVENT_TYPES.CHAT.MESSAGE.TRANSLATION_ADDED:
        await this.onTranslationAdded(event as EventPayload<TranslationAddedData>);
        break;
      default:
        this.logger.warn(`Unknown chat message event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as ChatMessageEventPayload;
    await this.applyEvent(payload);
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
