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
  IChatMessageRepository,
  CHAT_MESSAGE_REPOSITORY,
  MessageType,
  SenderType,
  MessageStatus,
} from '../../../ports';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../../domain/events/event.constants';

interface ChatMessageEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ChatMessageProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatMessageProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.CHAT_MESSAGE.PROJECTION);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      this.logger.warn('RabbitMQ is not connected. Skipping chat message projection subscription.');
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.CHAT_MESSAGE.PROJECTION,
      [ROUTING_KEYS.CHAT.MESSAGE.ALL],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.CHAT_MESSAGE.PROJECTION}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as ChatMessageEventPayload;

    this.logger.debug(
      `[Projection] ChatMessage event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case EVENT_TYPES.CHAT.MESSAGE.SENT:
        await this.onMessageSent(payload);
        break;

      case EVENT_TYPES.CHAT.MESSAGE.EDITED:
        await this.onMessageEdited(payload);
        break;

      case EVENT_TYPES.CHAT.MESSAGE.DELETED:
        await this.onMessageDeleted(payload);
        break;

      case EVENT_TYPES.CHAT.MESSAGE.MARKED_AS_READ:
        await this.onMessageMarkedAsRead(payload);
        break;

      case EVENT_TYPES.CHAT.MESSAGE.TRANSLATION_ADDED:
        await this.onTranslationAdded(payload);
        break;

      default:
        this.logger.warn(`Unknown chat message event type: ${payload.type}`);
    }
  }

  private async onMessageSent(event: ChatMessageEventPayload): Promise<void> {
    await this.messageRepository.create({
      id: event.aggregateId,
      roomId: event.data['roomId'] as string,
      senderId: event.data['senderId'] as string,
      senderType: event.data['senderType'] as SenderType,
      type: (event.data['type'] as MessageType) ?? MessageType.TEXT,
      content: event.data['content'] as string | undefined,
      fileUrls: (event.data['fileUrls'] as string[]) ?? [],
      fileName: event.data['fileName'] as string | undefined,
      voiceDuration: event.data['voiceDuration'] as number | undefined,
      replyToId: event.data['replyToId'] as string | undefined,
      status: MessageStatus.SENT,
      isRead: false,
      isDeleted: false,
      translations: [],
      editHistory: [],
      version: event.version,
    });
  }

  private async onMessageEdited(event: ChatMessageEventPayload): Promise<void> {
    const message = await this.messageRepository.findById(event.aggregateId);
    if (!message) return;

    const newContent = event.data['newContent'] as string;
    const previousContent = event.data['previousContent'] as string;
    const editedBy = event.data['editedBy'] as string;

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

  private async onMessageDeleted(event: ChatMessageEventPayload): Promise<void> {
    await this.messageRepository.softDelete(event.aggregateId);
  }

  private async onMessageMarkedAsRead(event: ChatMessageEventPayload): Promise<void> {
    await this.messageRepository.markAsRead(event.aggregateId, new Date(event.occurredAt));
  }

  private async onTranslationAdded(event: ChatMessageEventPayload): Promise<void> {
    const message = await this.messageRepository.findById(event.aggregateId);
    if (!message) return;

    const language = event.data['language'] as string;
    const content = event.data['content'] as string;
    const translatedAt = new Date(event.occurredAt);

    // Check if translation for this language already exists
    const existingIndex = message.translations.findIndex(t => t.language === language);

    const newTranslations = [...message.translations];
    if (existingIndex >= 0) {
      newTranslations[existingIndex] = { language, content, translatedAt };
    } else {
      newTranslations.push({ language, content, translatedAt });
    }

    await this.messageRepository.update(event.aggregateId, {
      translations: newTranslations,
      version: event.version,
    });
  }
}
