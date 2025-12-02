import { Controller, Inject, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { CommandBus, QueryBus } from '@flexobo/core';
import {
  CreateChatRoomCommand,
  SendMessageCommand,
} from '../../application/commands';
import {
  GetRoomByIdQuery,
  GetRoomByIdentifierQuery,
} from '../../application/queries';
import {
  IChatRoomRepository,
  CHAT_ROOM_REPOSITORY,
  ChatRoomReadModelDto,
  MessageType,
  SenderType,
  ChatRoomStatus,
} from '../../ports';

// ============================================================
// Request/Response Interfaces (match chat.proto)
// ============================================================

interface CreateChatRoomRequest {
  participantIds: string[];
  createdBy: string;
  isGroup: boolean;
  groupName: string;
  isSupportChat: boolean;
  identifierId: string;
  identifierType: string;
}

interface CreateChatRoomResponse {
  success: boolean;
  roomId: string;
  error: string;
  alreadyExists: boolean;
}

interface GetChatRoomRequest {
  roomId: string;
}

interface GetChatRoomByIdentifierRequest {
  identifierId: string;
  identifierType: string;
}

interface ChatRoomInfo {
  id: string;
  participants: string[];
  isGroup: boolean;
  groupName: string;
  isSupportChat: boolean;
  status: string;
  identifierId: string;
  identifierType: string;
  createdAt: string;
  lastMessageAt: string;
  unreadCounts: Record<string, number>;
}

interface GetChatRoomResponse {
  found: boolean;
  room?: ChatRoomInfo;
}

interface SendSystemMessageRequest {
  roomId: string;
  content: string;
  messageType: string;
  metadata: Record<string, string>;
}

interface SendSystemMessageResponse {
  success: boolean;
  messageId: string;
  error: string;
}

interface UpdateRoomStatusRequest {
  roomId: string;
  status: string;
  updatedBy: string;
}

interface UpdateRoomStatusResponse {
  success: boolean;
  error: string;
}

// ============================================================
// gRPC Controller
// ============================================================

@Controller()
export class ChatGrpcController {
  private readonly logger = new Logger(ChatGrpcController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(CHAT_ROOM_REPOSITORY)
    private readonly roomRepository: IChatRoomRepository
  ) {}

  /**
   * Create a new chat room.
   * Used by Main Service when a bid is created.
   */
  @GrpcMethod('ChatService', 'CreateChatRoom')
  async createChatRoom(
    request: CreateChatRoomRequest
  ): Promise<CreateChatRoomResponse> {
    this.logger.log(
      `CreateChatRoom request: identifierId=${request.identifierId}, type=${request.identifierType}`
    );

    try {
      // Check if room already exists by identifier
      if (request.identifierId && request.identifierType) {
        const existingRoom = await this.roomRepository.findByIdentifier(
          request.identifierId,
          request.identifierType
        );

        if (existingRoom) {
          this.logger.log(`Room already exists: ${existingRoom.id}`);
          return {
            success: true,
            roomId: existingRoom.id,
            error: '',
            alreadyExists: true,
          };
        }
      }

      // Create new room
      const command = new CreateChatRoomCommand(
        request.participantIds,
        request.createdBy,
        request.isGroup,
        request.groupName,
        request.isSupportChat,
        request.identifierId,
        request.identifierType
      );

      const result = await this.commandBus.execute<{
        room: ChatRoomReadModelDto;
      }>(command);

      if (result.isFailure) {
        this.logger.error(`Failed to create room: ${result.error?.message}`);
        return {
          success: false,
          roomId: '',
          error: result.error?.message || 'Failed to create room',
          alreadyExists: false,
        };
      }

      this.logger.log(`Room created: ${result.value.room.id}`);
      return {
        success: true,
        roomId: result.value.room.id,
        error: '',
        alreadyExists: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`CreateChatRoom error: ${message}`);
      return {
        success: false,
        roomId: '',
        error: message,
        alreadyExists: false,
      };
    }
  }

  /**
   * Get a chat room by ID.
   */
  @GrpcMethod('ChatService', 'GetChatRoom')
  async getChatRoom(request: GetChatRoomRequest): Promise<GetChatRoomResponse> {
    this.logger.log(`GetChatRoom request: roomId=${request.roomId}`);

    try {
      const query = new GetRoomByIdQuery(request.roomId);
      const room = await this.queryBus.execute<ChatRoomReadModelDto | null>(
        query
      );

      if (!room) {
        return { found: false };
      }

      return {
        found: true,
        room: this.mapToRoomInfo(room),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`GetChatRoom error: ${message}`);
      return { found: false };
    }
  }

  /**
   * Get a chat room by identifier (e.g., bidId, bookingId).
   */
  @GrpcMethod('ChatService', 'GetChatRoomByIdentifier')
  async getChatRoomByIdentifier(
    request: GetChatRoomByIdentifierRequest
  ): Promise<GetChatRoomResponse> {
    this.logger.log(
      `GetChatRoomByIdentifier: id=${request.identifierId}, type=${request.identifierType}`
    );

    try {
      const query = new GetRoomByIdentifierQuery(
        request.identifierId,
        request.identifierType
      );
      const room = await this.queryBus.execute<ChatRoomReadModelDto | null>(
        query
      );

      if (!room) {
        return { found: false };
      }

      return {
        found: true,
        room: this.mapToRoomInfo(room),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`GetChatRoomByIdentifier error: ${message}`);
      return { found: false };
    }
  }

  /**
   * Send a system message to a room.
   * Used for bid status updates (e.g., "#price500,USD", "accept", "reject").
   */
  @GrpcMethod('ChatService', 'SendSystemMessage')
  async sendSystemMessage(
    request: SendSystemMessageRequest
  ): Promise<SendSystemMessageResponse> {
    this.logger.log(
      `SendSystemMessage: roomId=${request.roomId}, type=${request.messageType}`
    );

    try {
      const messageType = this.parseMessageType(request.messageType);

      const command = new SendMessageCommand(
        request.roomId,
        'SYSTEM', // System sender ID
        SenderType.ADMIN,
        request.content,
        messageType,
        undefined, // fileUrls
        undefined, // fileName
        request.metadata as unknown as Record<string, unknown>, // fileMetadata (using for general metadata)
        undefined, // voiceDuration
        undefined // replyToId
      );

      const result = await this.commandBus.execute<{ message: { id: string } }>(
        command
      );

      if (result.isFailure) {
        this.logger.error(
          `Failed to send system message: ${result.error?.message}`
        );
        return {
          success: false,
          messageId: '',
          error: result.error?.message || 'Failed to send message',
        };
      }

      this.logger.log(`System message sent: ${result.value.message.id}`);
      return {
        success: true,
        messageId: result.value.message.id,
        error: '',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SendSystemMessage error: ${message}`);
      return {
        success: false,
        messageId: '',
        error: message,
      };
    }
  }

  /**
   * Update room status (e.g., archive when bid is cancelled).
   */
  @GrpcMethod('ChatService', 'UpdateRoomStatus')
  async updateRoomStatus(
    request: UpdateRoomStatusRequest
  ): Promise<UpdateRoomStatusResponse> {
    this.logger.log(
      `UpdateRoomStatus: roomId=${request.roomId}, status=${request.status}`
    );

    try {
      const status = this.parseRoomStatus(request.status);

      await this.roomRepository.update(request.roomId, { status });

      this.logger.log(`Room status updated: ${request.roomId} -> ${status}`);
      return {
        success: true,
        error: '',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`UpdateRoomStatus error: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  private mapToRoomInfo(room: ChatRoomReadModelDto): ChatRoomInfo {
    return {
      id: room.id,
      participants: room.participants,
      isGroup: room.isGroup,
      groupName: room.groupName || '',
      isSupportChat: room.isSupportChat,
      status: room.status,
      identifierId: room.identifierId || '',
      identifierType: room.identifierType || '',
      createdAt: room.createdAt?.toISOString() || '',
      lastMessageAt: room.lastMessageAt?.toISOString() || '',
      unreadCounts: room.unreadCounts || {},
    };
  }

  private parseMessageType(type: string): MessageType {
    const upperType = type.toUpperCase();
    if (Object.values(MessageType).includes(upperType as MessageType)) {
      return upperType as MessageType;
    }
    return MessageType.STATUS;
  }

  private parseRoomStatus(status: string): ChatRoomStatus {
    const upperStatus = status.toUpperCase();
    if (Object.values(ChatRoomStatus).includes(upperStatus as ChatRoomStatus)) {
      return upperStatus as ChatRoomStatus;
    }
    return ChatRoomStatus.ACTIVE;
  }
}
