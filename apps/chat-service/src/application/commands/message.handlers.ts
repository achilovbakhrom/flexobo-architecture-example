import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  SendMessageCommand,
  EditMessageCommand,
  DeleteMessageCommand,
  MarkMessageAsReadCommand,
  AddTranslationCommand,
} from './chat.commands';
import {
  IChatRoomAggregateStore,
  CHAT_ROOM_AGGREGATE_STORE,
} from '../../ports/chat-room.port';
import {
  IChatMessageAggregateStore,
  CHAT_MESSAGE_AGGREGATE_STORE,
  ChatMessageReadModelDto,
} from '../../ports/chat-message.port';
import { ChatMessage, MessageType } from '../../domain/aggregates/chat-message.aggregate';

/**
 * Response type for message commands.
 * Contains the message ID and version for client to poll or subscribe.
 * The full read model will be available after projection processes the event.
 */
export interface MessageCommandResult {
  id: string;
  version: number;
  roomId: string;
}

/**
 * @deprecated Use MessageCommandResult instead. SendMessageResult includes data
 * that should come from read model after projection processes the event.
 */
export interface SendMessageResult {
  message: ChatMessageReadModelDto;
  roomId: string;
  unreadCounts: Record<string, number>;
}

@CommandHandler(SendMessageCommand)
export class SendMessageHandler
  implements ICommandHandler<SendMessageCommand, MessageCommandResult>
{
  constructor(
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore,
    @Inject(CHAT_MESSAGE_AGGREGATE_STORE)
    private readonly messageStore: IChatMessageAggregateStore
  ) {}

  async execute(
    command: SendMessageCommand
  ): Promise<Result<MessageCommandResult, Error>> {
    try {
      // Load room
      const room = await this.roomStore.load(command.roomId);
      if (!room) {
        return new Failure(new NotFoundException('Room not found'));
      }

      const roomState = room.getState();
      if (!roomState.participants.includes(command.senderId)) {
        return new Failure(new ForbiddenException('Not a participant of this room'));
      }

      // Create message aggregate
      const message = ChatMessage.send({
        roomId: command.roomId,
        senderId: command.senderId,
        senderType: command.senderType,
        content: command.content,
        type: command.type || MessageType.Text,
        fileUrls: command.fileUrls,
        fileName: command.fileName,
        fileMetadata: command.fileMetadata,
        voiceDuration: command.voiceDuration,
        replyToId: command.replyToId,
      });

      // Save message aggregate - projection will update message read model via RabbitMQ
      await this.messageStore.save(message);

      // Update room with message info and increment unread counts
      const messageState = message.getState();
      const preview = messageState.content?.substring(0, 100) ||
        (messageState.type !== MessageType.Text ? `[${messageState.type}]` : '');

      room.addMessage(message.id, preview, command.senderId);
      // Save room aggregate - projection will update room read model via RabbitMQ
      await this.roomStore.save(room);

      // Return minimal result - read models will be updated by projections
      return new Success({
        id: message.id,
        version: message.version,
        roomId: command.roomId,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(EditMessageCommand)
export class EditMessageHandler
  implements ICommandHandler<EditMessageCommand, MessageCommandResult>
{
  constructor(
    @Inject(CHAT_MESSAGE_AGGREGATE_STORE)
    private readonly messageStore: IChatMessageAggregateStore
  ) {}

  async execute(
    command: EditMessageCommand
  ): Promise<Result<MessageCommandResult, Error>> {
    try {
      const message = await this.messageStore.load(command.messageId);
      if (!message) {
        return new Failure(new NotFoundException('Message not found'));
      }

      const state = message.getState();
      if (state.senderId !== command.userId) {
        return new Failure(new ForbiddenException('Cannot edit messages from other users'));
      }

      message.edit(command.content, command.userId);
      await this.messageStore.save(message);

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: message.id,
        version: message.version,
        roomId: state.roomId,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(DeleteMessageCommand)
export class DeleteMessageHandler
  implements ICommandHandler<DeleteMessageCommand, MessageCommandResult>
{
  constructor(
    @Inject(CHAT_MESSAGE_AGGREGATE_STORE)
    private readonly messageStore: IChatMessageAggregateStore
  ) {}

  async execute(command: DeleteMessageCommand): Promise<Result<MessageCommandResult, Error>> {
    try {
      const message = await this.messageStore.load(command.messageId);
      if (!message) {
        return new Failure(new NotFoundException('Message not found'));
      }

      const state = message.getState();
      if (state.senderId !== command.userId) {
        return new Failure(new ForbiddenException('Cannot delete messages from other users'));
      }

      message.delete(command.userId);
      await this.messageStore.save(message);

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: message.id,
        version: message.version,
        roomId: state.roomId,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(MarkMessageAsReadCommand)
export class MarkMessageAsReadHandler
  implements ICommandHandler<MarkMessageAsReadCommand, MessageCommandResult | null>
{
  constructor(
    @Inject(CHAT_MESSAGE_AGGREGATE_STORE)
    private readonly messageStore: IChatMessageAggregateStore
  ) {}

  async execute(
    command: MarkMessageAsReadCommand
  ): Promise<Result<MessageCommandResult | null, Error>> {
    try {
      const message = await this.messageStore.load(command.messageId);
      if (!message) {
        return new Failure(new NotFoundException('Message not found'));
      }

      const messageState = message.getState();

      // Cannot mark own messages as read - no-op
      if (messageState.senderId === command.userId) {
        return new Success(null);
      }

      // Already read - no-op
      if (messageState.isRead) {
        return new Success(null);
      }

      message.markAsRead(command.userId);
      await this.messageStore.save(message);

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: message.id,
        version: message.version,
        roomId: messageState.roomId,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(AddTranslationCommand)
export class AddTranslationHandler
  implements ICommandHandler<AddTranslationCommand, MessageCommandResult>
{
  constructor(
    @Inject(CHAT_MESSAGE_AGGREGATE_STORE)
    private readonly messageStore: IChatMessageAggregateStore
  ) {}

  async execute(
    command: AddTranslationCommand
  ): Promise<Result<MessageCommandResult, Error>> {
    try {
      const message = await this.messageStore.load(command.messageId);
      if (!message) {
        return new Failure(new NotFoundException('Message not found'));
      }

      const state = message.getState();
      message.addTranslation(command.language, command.translatedContent);
      await this.messageStore.save(message);

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: message.id,
        version: message.version,
        roomId: state.roomId,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
