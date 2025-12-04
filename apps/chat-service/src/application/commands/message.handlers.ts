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
  IChatRoomRepository,
  CHAT_ROOM_REPOSITORY,
  IChatRoomAggregateStore,
  CHAT_ROOM_AGGREGATE_STORE,
} from '../../ports/chat-room.port';
import {
  IChatMessageRepository,
  CHAT_MESSAGE_REPOSITORY,
  IChatMessageAggregateStore,
  CHAT_MESSAGE_AGGREGATE_STORE,
  ChatMessageReadModelDto,
} from '../../ports/chat-message.port';
import { ChatMessage, MessageType, MessageStatus } from '../../domain/aggregates/chat-message.aggregate';

export interface SendMessageResult {
  message: ChatMessageReadModelDto;
  roomId: string;
  unreadCounts: Record<string, number>;
}

@CommandHandler(SendMessageCommand)
export class SendMessageHandler
  implements ICommandHandler<SendMessageCommand, SendMessageResult>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository,
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore,
    @Inject(CHAT_MESSAGE_AGGREGATE_STORE)
    private readonly messageStore: IChatMessageAggregateStore
  ) {}

  async execute(
    command: SendMessageCommand
  ): Promise<Result<SendMessageResult, Error>> {
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

      // Save message aggregate
      await this.messageStore.save(message);

      // Create message read model
      const messageState = message.getState();
      const messageReadModel = await this.messageRepository.create({
        id: message.id,
        roomId: messageState.roomId,
        senderId: messageState.senderId,
        senderType: messageState.senderType,
        type: messageState.type,
        content: messageState.content,
        fileUrls: messageState.fileUrls,
        fileName: messageState.fileName,
        fileMetadata: messageState.fileMetadata,
        voiceDuration: messageState.voiceDuration,
        status: messageState.status,
        isRead: messageState.isRead,
        readAt: messageState.readAt,
        replyToId: messageState.replyToId,
        translations: messageState.translations,
        editHistory: messageState.editHistory,
        isDeleted: messageState.isDeleted,
        deletedAt: messageState.deletedAt,
        version: message.version,
        lastEventId: undefined,
      });

      // Update room with message info and increment unread counts
      const preview = messageState.content?.substring(0, 100) ||
        (messageState.type !== MessageType.Text ? `[${messageState.type}]` : '');

      room.addMessage(message.id, preview, command.senderId);
      await this.roomStore.save(room);

      const newRoomState = room.getState();

      // Update room read model
      await this.roomRepository.updateLastMessage(
        command.roomId,
        message.id,
        preview,
        new Date()
      );

      // Update unread counts for each participant (except sender)
      for (const participantId of roomState.participants) {
        if (participantId !== command.senderId) {
          const currentCount = newRoomState.unreadCounts[participantId] || 0;
          await this.roomRepository.updateUnreadCount(command.roomId, participantId, currentCount);
        }
      }

      return new Success({
        message: messageReadModel,
        roomId: command.roomId,
        unreadCounts: newRoomState.unreadCounts,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(EditMessageCommand)
export class EditMessageHandler
  implements ICommandHandler<EditMessageCommand, ChatMessageReadModelDto>
{
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository,
    @Inject(CHAT_MESSAGE_AGGREGATE_STORE)
    private readonly messageStore: IChatMessageAggregateStore
  ) {}

  async execute(
    command: EditMessageCommand
  ): Promise<Result<ChatMessageReadModelDto, Error>> {
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

      const newState = message.getState();
      const updatedMessage = await this.messageRepository.update(command.messageId, {
        content: newState.content,
        editHistory: newState.editHistory,
        version: message.version,
      });

      return new Success(updatedMessage);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(DeleteMessageCommand)
export class DeleteMessageHandler
  implements ICommandHandler<DeleteMessageCommand, void>
{
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository,
    @Inject(CHAT_MESSAGE_AGGREGATE_STORE)
    private readonly messageStore: IChatMessageAggregateStore
  ) {}

  async execute(command: DeleteMessageCommand): Promise<Result<void, Error>> {
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

      await this.messageRepository.softDelete(command.messageId);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(MarkMessageAsReadCommand)
export class MarkMessageAsReadHandler
  implements ICommandHandler<MarkMessageAsReadCommand, ChatMessageReadModelDto>
{
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository,
    @Inject(CHAT_MESSAGE_AGGREGATE_STORE)
    private readonly messageStore: IChatMessageAggregateStore,
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: MarkMessageAsReadCommand
  ): Promise<Result<ChatMessageReadModelDto, Error>> {
    try {
      const message = await this.messageStore.load(command.messageId);
      if (!message) {
        return new Failure(new NotFoundException('Message not found'));
      }

      const messageState = message.getState();
      if (messageState.senderId === command.userId) {
        // Cannot mark own messages as read
        const existingMessage = await this.messageRepository.findById(command.messageId);
        return new Success(existingMessage!);
      }

      if (messageState.isRead) {
        // Already read
        const existingMessage = await this.messageRepository.findById(command.messageId);
        return new Success(existingMessage!);
      }

      message.markAsRead(command.userId);
      await this.messageStore.save(message);

      const readAt = new Date();
      await this.messageRepository.markAsRead(command.messageId, readAt);

      // Decrement unread count in room
      const room = await this.roomStore.load(messageState.roomId);
      if (room) {
        const roomState = room.getState();
        const currentCount = roomState.unreadCounts[command.userId] || 0;
        if (currentCount > 0) {
          await this.roomRepository.updateUnreadCount(
            messageState.roomId,
            command.userId,
            currentCount - 1
          );
        }
      }

      const updatedMessage = await this.messageRepository.findById(command.messageId);
      return new Success(updatedMessage!);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(AddTranslationCommand)
export class AddTranslationHandler
  implements ICommandHandler<AddTranslationCommand, ChatMessageReadModelDto>
{
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository,
    @Inject(CHAT_MESSAGE_AGGREGATE_STORE)
    private readonly messageStore: IChatMessageAggregateStore
  ) {}

  async execute(
    command: AddTranslationCommand
  ): Promise<Result<ChatMessageReadModelDto, Error>> {
    try {
      const message = await this.messageStore.load(command.messageId);
      if (!message) {
        return new Failure(new NotFoundException('Message not found'));
      }

      message.addTranslation(command.language, command.translatedContent);
      await this.messageStore.save(message);

      const newState = message.getState();
      const updatedMessage = await this.messageRepository.update(command.messageId, {
        translations: newState.translations,
        version: message.version,
      });

      return new Success(updatedMessage);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
