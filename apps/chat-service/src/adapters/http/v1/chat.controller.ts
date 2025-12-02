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
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Multer } from 'multer';
import { ChatService } from '../../../application/services/chat.service';
import { ChatGateway } from '../../websocket/chat.gateway';
import {
  CreateRoomDto,
  EditMessageDto,
  UpdateTranslationSettingsDto,
  ChatRoomResponseDto,
  MessageResponseDto,
  PaginatedResponseDto,
} from '../../../application/dto/chat.dto';
import { ChatEvents, SenderType } from '../../../domain/enums/chat.enums';
import { HttpJwtAuthGuard } from '../../../infrastructure/guards/http-jwt-auth.guard';
import { StorageService } from '../../../infrastructure/services/storage.service';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('api/v1/chat')
@UseGuards(HttpJwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly gateway: ChatGateway,
    private readonly storageService: StorageService
  ) {}

  @Get('rooms')
  @ApiOperation({ summary: 'Get user chat rooms' })
  @ApiResponse({ status: 200 })
  async getUserRooms(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ): Promise<PaginatedResponseDto<ChatRoomResponseDto>> {
    return this.chatService.getUserRooms(req.user.userId, +page, +limit);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get a chat room by ID' })
  async getRoom(@Param('id') id: string) {
    const room = await this.chatService.getOneRoom(id);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return { data: room };
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Create or find a chat room' })
  async createRoom(@Req() req: any, @Body() body: CreateRoomDto) {
    // Add current user to participants if not already included
    if (!body.participants.includes(req.user.userId)) {
      body.participants.push(req.user.userId);
    }

    const room = await this.chatService.createOrFindRoom(body);
    return { data: room };
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get messages for a room' })
  async getRoomMessages(
    @Param('roomId') roomId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ): Promise<PaginatedResponseDto<MessageResponseDto>> {
    const room = await this.chatService.getRoomById(roomId);
    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    return this.chatService.getMessagesForUser(roomId, +page, +limit);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file for chat' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    // Fix for Cyrillic and other non-ASCII filenames
    let originalName = file.originalname;
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf-8');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to convert filename encoding: ${msg}`);
    }

    const result = await this.storageService.upload(file.buffer, {
      originalName,
      mimeType: file.mimetype,
      size: file.size,
      uploaderId: req.user.userId,
    });

    return {
      data: {
        fileId: result.fileId,
        fileUrl: result.fileUrl,
        metadata: {
          originalName,
          mimeType: file.mimetype,
          size: file.size,
        },
      },
    };
  }

  @Put('messages/:id')
  @ApiOperation({ summary: 'Edit a message' })
  async editMessage(
    @Param('id') id: string,
    @Body() body: EditMessageDto,
    @Req() req: any
  ) {
    const message = await this.chatService.editMessage(id, body, req.user.userId);
    if (!message) {
      throw new NotFoundException('Message not found or unauthorized');
    }

    // Emit edit event via WebSocket
    this.gateway.server
      .to(message.roomId)
      .emit(ChatEvents.MESSAGE_EDITED, message);

    return { data: message };
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(@Param('id') id: string, @Req() req: any) {
    const message = await this.chatService.deleteMessage(id, req.user.userId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Emit delete event via WebSocket
    this.gateway.server.to(message.roomId).emit(ChatEvents.MESSAGE_DELETED, {
      messageId: id,
    });

    return { success: true };
  }

  @Delete('rooms/:id')
  @ApiOperation({ summary: 'Delete a chat room' })
  async deleteRoom(@Param('id') id: string, @Req() req: any) {
    const room = await this.chatService.deleteRoom(id, req.user.userId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Emit delete event via WebSocket
    this.gateway.server.to(room.id).emit(ChatEvents.ROOM_DELETED, {
      roomId: id,
    });

    return { success: true };
  }

  @Get('file/:fileId')
  @ApiOperation({ summary: 'Get file URL' })
  async getFile(@Param('fileId') fileId: string) {
    try {
      const fileUrl = await this.storageService.getUrl(fileId);
      return { data: { fileUrl } };
    } catch (error) {
      throw new NotFoundException('File not found');
    }
  }

  @Put('rooms/:roomId/translation')
  @ApiOperation({ summary: 'Update translation settings for a room' })
  async updateTranslationSettings(
    @Param('roomId') roomId: string,
    @Body() dto: UpdateTranslationSettingsDto,
    @Req() req: any
  ) {
    const room = await this.chatService.updateTranslationSettings(
      roomId,
      req.user.userId,
      dto.language || null
    );

    return { data: room };
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread chats count' })
  async getUnreadCount(@Req() req: any) {
    const unreadData = await this.chatService.getUserUnreadChatsCount(
      req.user.userId
    );
    return { data: unreadData };
  }
}
