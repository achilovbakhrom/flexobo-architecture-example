import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  CreateChatRoomCommand,
  AddParticipantCommand,
  RemoveParticipantCommand,
  ArchiveRoomCommand,
  DeleteRoomCommand,
  UpdateTranslationSettingsCommand,
  MarkRoomAsReadCommand,
} from './chat.commands';
import {
  IChatRoomRepository,
  CHAT_ROOM_REPOSITORY,
  IChatRoomAggregateStore,
  CHAT_ROOM_AGGREGATE_STORE,
  ChatRoomReadModelDto,
} from '../../ports/chat-room.port';
import {
  IChatMessageRepository,
  CHAT_MESSAGE_REPOSITORY,
} from '../../ports/chat-message.port';
import { ChatRoom } from '../../domain/aggregates/chat-room.aggregate';

@CommandHandler(CreateChatRoomCommand)
export class CreateChatRoomHandler
  implements ICommandHandler<CreateChatRoomCommand, ChatRoomReadModelDto>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: CreateChatRoomCommand
  ): Promise<Result<ChatRoomReadModelDto, Error>> {
    try {
      const sortedParticipants = [...command.participants].sort();

      // Check if room with same participants already exists (for non-group chats)
      if (!command.isGroup) {
        if (command.identifierId && command.identifierType) {
          const existingRoom = await this.roomRepository.findByIdentifier(
            command.identifierId,
            command.identifierType
          );
          if (existingRoom) {
            return new Success(existingRoom);
          }
        } else {
          const existingRoom = await this.roomRepository.findByParticipants(sortedParticipants);
          if (existingRoom) {
            return new Success(existingRoom);
          }
        }
      }

      // Create new room aggregate
      const room = ChatRoom.create({
        participants: sortedParticipants,
        isGroup: command.isGroup || false,
        groupName: command.groupName,
        isSupportChat: command.isSupportChat || false,
        identifierId: command.identifierId,
        identifierType: command.identifierType,
        createdBy: command.createdBy,
      });

      // Save aggregate (persist events)
      await this.roomStore.save(room);

      // Get state and create read model
      const state = room.getState();
      const readModel = await this.roomRepository.create({
        id: room.id,
        participants: state.participants,
        isGroup: state.isGroup,
        groupName: state.groupName,
        isSupportChat: state.isSupportChat,
        status: state.status,
        unreadCounts: state.unreadCounts,
        translationSettings: state.translationSettings,
        lastMessageId: state.lastMessageId,
        lastMessagePreview: state.lastMessagePreview,
        lastMessageAt: state.lastMessageAt,
        identifierId: state.identifierId,
        identifierType: state.identifierType,
        isDeleted: state.isDeleted,
        deletedAt: state.deletedAt,
        version: room.version,
        lastEventId: undefined,
      });

      return new Success(readModel);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(AddParticipantCommand)
export class AddParticipantHandler
  implements ICommandHandler<AddParticipantCommand, ChatRoomReadModelDto>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: AddParticipantCommand
  ): Promise<Result<ChatRoomReadModelDto, Error>> {
    try {
      const room = await this.roomStore.load(command.roomId);
      if (!room) {
        return new Failure(new NotFoundException('Room not found'));
      }

      room.addParticipant(command.userId, command.addedBy);
      await this.roomStore.save(room);

      const state = room.getState();
      const updatedRoom = await this.roomRepository.update(command.roomId, {
        participants: state.participants,
        version: room.version,
      });

      return new Success(updatedRoom);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(RemoveParticipantCommand)
export class RemoveParticipantHandler
  implements ICommandHandler<RemoveParticipantCommand, ChatRoomReadModelDto>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: RemoveParticipantCommand
  ): Promise<Result<ChatRoomReadModelDto, Error>> {
    try {
      const room = await this.roomStore.load(command.roomId);
      if (!room) {
        return new Failure(new NotFoundException('Room not found'));
      }

      room.removeParticipant(command.userId, command.removedBy);
      await this.roomStore.save(room);

      const state = room.getState();
      const updatedRoom = await this.roomRepository.update(command.roomId, {
        participants: state.participants,
        version: room.version,
      });

      return new Success(updatedRoom);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(ArchiveRoomCommand)
export class ArchiveRoomHandler
  implements ICommandHandler<ArchiveRoomCommand, ChatRoomReadModelDto>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: ArchiveRoomCommand
  ): Promise<Result<ChatRoomReadModelDto, Error>> {
    try {
      const room = await this.roomStore.load(command.roomId);
      if (!room) {
        return new Failure(new NotFoundException('Room not found'));
      }

      const state = room.getState();
      if (!state.participants.includes(command.userId)) {
        return new Failure(new ForbiddenException('Not a participant of this room'));
      }

      room.archive(command.userId);
      await this.roomStore.save(room);

      const newState = room.getState();
      const updatedRoom = await this.roomRepository.update(command.roomId, {
        status: newState.status,
        version: room.version,
      });

      return new Success(updatedRoom);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(DeleteRoomCommand)
export class DeleteRoomHandler
  implements ICommandHandler<DeleteRoomCommand, void>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(command: DeleteRoomCommand): Promise<Result<void, Error>> {
    try {
      const room = await this.roomStore.load(command.roomId);
      if (!room) {
        return new Failure(new NotFoundException('Room not found'));
      }

      const state = room.getState();
      if (!state.participants.includes(command.userId)) {
        return new Failure(new ForbiddenException('Not a participant of this room'));
      }

      room.delete(command.userId);
      await this.roomStore.save(room);

      await this.roomRepository.softDelete(command.roomId);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(UpdateTranslationSettingsCommand)
export class UpdateTranslationSettingsHandler
  implements ICommandHandler<UpdateTranslationSettingsCommand, ChatRoomReadModelDto>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: UpdateTranslationSettingsCommand
  ): Promise<Result<ChatRoomReadModelDto, Error>> {
    try {
      const room = await this.roomStore.load(command.roomId);
      if (!room) {
        return new Failure(new NotFoundException('Room not found'));
      }

      const state = room.getState();
      if (!state.participants.includes(command.userId)) {
        return new Failure(new ForbiddenException('Not a participant of this room'));
      }

      room.updateTranslationSettings(command.userId, command.enabled, command.targetLanguage);
      await this.roomStore.save(room);

      await this.roomRepository.updateTranslationSettings(
        command.roomId,
        command.userId,
        { enabled: command.enabled, targetLanguage: command.targetLanguage }
      );

      const updatedRoom = await this.roomRepository.findById(command.roomId);
      return new Success(updatedRoom!);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(MarkRoomAsReadCommand)
export class MarkRoomAsReadHandler
  implements ICommandHandler<MarkRoomAsReadCommand, ChatRoomReadModelDto>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository,
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: MarkRoomAsReadCommand
  ): Promise<Result<ChatRoomReadModelDto, Error>> {
    try {
      const room = await this.roomStore.load(command.roomId);
      if (!room) {
        return new Failure(new NotFoundException('Room not found'));
      }

      const state = room.getState();
      if (!state.participants.includes(command.userId)) {
        return new Failure(new ForbiddenException('Not a participant of this room'));
      }

      // Mark all messages in room as read
      const readAt = new Date();
      await this.messageRepository.markAllAsReadInRoom(command.roomId, command.userId, readAt);

      // Update room's unread count
      room.markAsRead(command.userId);
      await this.roomStore.save(room);

      await this.roomRepository.updateUnreadCount(command.roomId, command.userId, 0);

      const updatedRoom = await this.roomRepository.findById(command.roomId);
      return new Success(updatedRoom!);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
