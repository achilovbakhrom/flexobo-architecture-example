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
import { ChatRoom } from '../../domain/aggregates/chat-room.aggregate';

/**
 * Response type for room commands.
 * Contains the room ID and version for client to poll or subscribe.
 * The full read model will be available after projection processes the event.
 */
export interface RoomCommandResult {
  id: string;
  version: number;
}

@CommandHandler(CreateChatRoomCommand)
export class CreateChatRoomHandler
  implements ICommandHandler<CreateChatRoomCommand, RoomCommandResult | ChatRoomReadModelDto>
{
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository,
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: CreateChatRoomCommand
  ): Promise<Result<RoomCommandResult | ChatRoomReadModelDto, Error>> {
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

      // Save aggregate (persist events) - projection will update read model via RabbitMQ
      await this.roomStore.save(room);

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: room.id,
        version: room.version,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(AddParticipantCommand)
export class AddParticipantHandler
  implements ICommandHandler<AddParticipantCommand, RoomCommandResult>
{
  constructor(
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: AddParticipantCommand
  ): Promise<Result<RoomCommandResult, Error>> {
    try {
      const room = await this.roomStore.load(command.roomId);
      if (!room) {
        return new Failure(new NotFoundException('Room not found'));
      }

      room.addParticipant(command.userId, command.addedBy);
      await this.roomStore.save(room);

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: room.id,
        version: room.version,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(RemoveParticipantCommand)
export class RemoveParticipantHandler
  implements ICommandHandler<RemoveParticipantCommand, RoomCommandResult>
{
  constructor(
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: RemoveParticipantCommand
  ): Promise<Result<RoomCommandResult, Error>> {
    try {
      const room = await this.roomStore.load(command.roomId);
      if (!room) {
        return new Failure(new NotFoundException('Room not found'));
      }

      room.removeParticipant(command.userId, command.removedBy);
      await this.roomStore.save(room);

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: room.id,
        version: room.version,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(ArchiveRoomCommand)
export class ArchiveRoomHandler
  implements ICommandHandler<ArchiveRoomCommand, RoomCommandResult>
{
  constructor(
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: ArchiveRoomCommand
  ): Promise<Result<RoomCommandResult, Error>> {
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

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: room.id,
        version: room.version,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(DeleteRoomCommand)
export class DeleteRoomHandler
  implements ICommandHandler<DeleteRoomCommand, RoomCommandResult>
{
  constructor(
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(command: DeleteRoomCommand): Promise<Result<RoomCommandResult, Error>> {
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

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: room.id,
        version: room.version,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(UpdateTranslationSettingsCommand)
export class UpdateTranslationSettingsHandler
  implements ICommandHandler<UpdateTranslationSettingsCommand, RoomCommandResult>
{
  constructor(
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: UpdateTranslationSettingsCommand
  ): Promise<Result<RoomCommandResult, Error>> {
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

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: room.id,
        version: room.version,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}

@CommandHandler(MarkRoomAsReadCommand)
export class MarkRoomAsReadHandler
  implements ICommandHandler<MarkRoomAsReadCommand, RoomCommandResult>
{
  constructor(
    @Inject(CHAT_ROOM_AGGREGATE_STORE)
    private readonly roomStore: IChatRoomAggregateStore
  ) {}

  async execute(
    command: MarkRoomAsReadCommand
  ): Promise<Result<RoomCommandResult, Error>> {
    try {
      const room = await this.roomStore.load(command.roomId);
      if (!room) {
        return new Failure(new NotFoundException('Room not found'));
      }

      const state = room.getState();
      if (!state.participants.includes(command.userId)) {
        return new Failure(new ForbiddenException('Not a participant of this room'));
      }

      // Update room's unread count - projection will handle the read model update
      room.markAsRead(command.userId);
      await this.roomStore.save(room);

      // Return minimal result - read model will be updated by projection
      return new Success({
        id: room.id,
        version: room.version,
      });
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
