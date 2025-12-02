import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@flexobo/core';
import { ChatGateway } from '../../websocket/chat.gateway';
import {
  CreateRoomDto,
  EditMessageDto,
  UpdateTranslationSettingsDto,
  ChatRoomResponseDto,
  MessageResponseDto,
  PaginatedResponseDto,
} from '../dto';
import { HttpJwtAuthGuard } from '../guards';
import {
  ChatEvents,
  ChatRoomReadModelDto,
  ChatMessageReadModelDto,
} from '../../../ports';

// Commands
import {
  CreateChatRoomCommand,
  EditMessageCommand,
  DeleteMessageCommand,
  DeleteRoomCommand,
  UpdateTranslationSettingsCommand,
} from '../../../application/commands';

// Queries
import {
  GetRoomByIdQuery,
  GetUserRoomsQuery,
  GetRoomMessagesQuery,
  GetUserUnreadStatsQuery,
  PaginatedResult,
  UnreadStatsResult,
} from '../../../application/queries';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('api/v1/chat')
@UseGuards(HttpJwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly gateway: ChatGateway
  ) {}

  @Get('rooms')
  @ApiOperation({ summary: 'Get user chat rooms' })
  @ApiResponse({ status: 200 })
  async getUserRooms(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ): Promise<PaginatedResponseDto<ChatRoomResponseDto>> {
    const query = new GetUserRoomsQuery(req.user.userId, +page, +limit);
    const result = await this.queryBus.execute<PaginatedResult<ChatRoomReadModelDto>>(query);

    return {
      data: result.data.map((room) => this.mapToRoomResponse(room)),
      pagination: result.pagination,
    };
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get a chat room by ID' })
  async getRoom(@Param('id') id: string) {
    const query = new GetRoomByIdQuery(id);
    const room = await this.queryBus.execute<ChatRoomReadModelDto | null>(query);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return { data: this.mapToRoomResponse(room) };
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Create or find a chat room' })
  async createRoom(@Req() req: any, @Body() body: CreateRoomDto) {
    // Add current user to participants if not already included
    const participants = body.participants.includes(req.user.userId)
      ? body.participants
      : [...body.participants, req.user.userId];

    const command = new CreateChatRoomCommand(
      participants,
      req.user.userId,
      body.isGroup,
      body.groupName,
      body.isSupportChat,
      body.identifierId,
      body.identifierType
    );

    const result = await this.commandBus.execute<ChatRoomReadModelDto>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { data: this.mapToRoomResponse(result.value) };
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get messages for a room' })
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ): Promise<PaginatedResponseDto<MessageResponseDto>> {
    const roomQuery = new GetRoomByIdQuery(roomId);
    const room = await this.queryBus.execute<ChatRoomReadModelDto | null>(roomQuery);

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    const messagesQuery = new GetRoomMessagesQuery(roomId, +page, +limit);
    const result = await this.queryBus.execute<PaginatedResult<ChatMessageReadModelDto>>(messagesQuery);

    return {
      data: result.data.map((msg) => this.mapToMessageResponse(msg)),
      pagination: result.pagination,
    };
  }

  // File upload has been moved to File Service
  // Use POST /api/v1/files/chat/upload instead

  @Put('messages/:id')
  @ApiOperation({ summary: 'Edit a message' })
  async editMessage(
    @Param('id') id: string,
    @Body() body: EditMessageDto,
    @Req() req: any
  ) {
    const command = new EditMessageCommand(id, req.user.userId, body.content);
    const result = await this.commandBus.execute<ChatMessageReadModelDto>(command);

    if (result.isFailure) {
      if (result.error instanceof NotFoundException) {
        throw new NotFoundException('Message not found or unauthorized');
      }
      throw result.error;
    }

    const message = result.value;

    // Emit edit event via WebSocket
    this.gateway.notifyRoom(message.roomId, ChatEvents.MESSAGE_EDITED, message);

    return { data: this.mapToMessageResponse(message) };
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(@Param('id') id: string, @Req() req: any) {
    const command = new DeleteMessageCommand(id, req.user.userId);
    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      if (result.error instanceof NotFoundException) {
        throw new NotFoundException('Message not found');
      }
      throw result.error;
    }

    // Emit delete event via WebSocket
    // We need to get the message first to know its roomId
    // Since we're deleting, we emit to all rooms the user is in
    this.gateway.notifyUser(req.user.userId, ChatEvents.MESSAGE_DELETED, {
      messageId: id,
    });

    return { success: true };
  }

  @Delete('rooms/:id')
  @ApiOperation({ summary: 'Delete a chat room' })
  async deleteRoom(@Param('id') id: string, @Req() req: any) {
    const command = new DeleteRoomCommand(id, req.user.userId);
    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      if (result.error instanceof NotFoundException) {
        throw new NotFoundException('Room not found');
      }
      throw result.error;
    }

    // Emit delete event via WebSocket
    this.gateway.notifyRoom(id, ChatEvents.ROOM_DELETED, { roomId: id });

    return { success: true };
  }

  // File retrieval has been moved to File Service
  // Use GET /api/v1/files/:fileId instead

  @Put('rooms/:roomId/translation')
  @ApiOperation({ summary: 'Update translation settings for a room' })
  async updateTranslationSettings(
    @Param('roomId') roomId: string,
    @Body() dto: UpdateTranslationSettingsDto,
    @Req() req: any
  ) {
    const command = new UpdateTranslationSettingsCommand(
      roomId,
      req.user.userId,
      dto.language !== null && dto.language !== undefined,
      dto.language || 'en'
    );

    const result = await this.commandBus.execute<ChatRoomReadModelDto>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { data: this.mapToRoomResponse(result.value) };
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread chats count' })
  async getUnreadCount(@Req() req: any) {
    const query = new GetUserUnreadStatsQuery(req.user.userId);
    const unreadData = await this.queryBus.execute<UnreadStatsResult>(query);

    return { data: unreadData };
  }

  private mapToRoomResponse(room: ChatRoomReadModelDto): ChatRoomResponseDto {
    return {
      id: room.id,
      participants: room.participants,
      isGroup: room.isGroup,
      groupName: room.groupName,
      isSupportChat: room.isSupportChat,
      status: room.status,
      unreadCounts: room.unreadCounts,
      lastMessagePreview: room.lastMessagePreview,
      lastMessageAt: room.lastMessageAt,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  private mapToMessageResponse(message: ChatMessageReadModelDto): MessageResponseDto {
    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderType: message.senderType,
      type: message.type,
      content: message.content,
      fileUrls: message.fileUrls,
      fileName: message.fileName,
      voiceDuration: message.voiceDuration,
      isRead: message.isRead,
      readAt: message.readAt,
      replyToId: message.replyToId,
      translations: message.translations.map((t) => ({
        language: t.language,
        text: t.content,
      })),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
