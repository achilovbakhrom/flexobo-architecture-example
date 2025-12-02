import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  SendMessageDto,
  CreateRoomDto,
  EditMessageDto,
  MessageResponseDto,
  ChatRoomResponseDto,
  PaginatedResponseDto,
} from '../dto/chat.dto';
import {
  MessageType,
  SenderType,
  ChatRoomStatus,
} from '../../domain/enums/chat.enums';
import { ChatRoom, ChatMessage } from '.prisma/chat-client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(
    data: SendMessageDto & { senderId: string; senderType: SenderType }
  ): Promise<{ message: ChatMessage; room: ChatRoom }> {
    // Create the message
    const message = await this.prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        senderId: data.senderId,
        senderType: data.senderType,
        type: data.type || MessageType.TEXT,
        content: data.content,
        fileUrls: data.fileUrls || [],
        fileName: data.fileName,
        voiceDuration: data.voiceDuration,
        replyToId: data.replyToId,
      },
      include: {
        replyTo: true,
      },
    });

    // Update room with last message info
    const room = await this.prisma.chatRoom.update({
      where: { id: data.roomId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: new Date(),
        lastMessagePreview: message.content?.substring(0, 100) || '',
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Increment unread count for other participants
    const unreadCounts = (room.unreadCounts as Record<string, number>) || {};
    for (const participantId of room.participants) {
      if (participantId !== data.senderId) {
        unreadCounts[participantId] = (unreadCounts[participantId] || 0) + 1;
      }
    }

    const updatedRoom = await this.prisma.chatRoom.update({
      where: { id: room.id },
      data: { unreadCounts },
    });

    return { message, room: updatedRoom };
  }

  async getMessages(
    roomId: string,
    page = 1,
    limit = 20
  ): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { roomId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        replyTo: true,
      },
    });
  }

  async createOrFindRoom(body: CreateRoomDto): Promise<ChatRoom> {
    // Sort participants to ensure consistent matching
    const sortedParticipants = [...body.participants].sort();

    // Try to find existing room
    let existingRoom: ChatRoom | null = null;

    if (body.identifierId && body.identifierType) {
      // Find by identifier
      existingRoom = await this.prisma.chatRoom.findFirst({
        where: {
          identifierId: body.identifierId,
          identifierType: body.identifierType,
          isDeleted: false,
        },
      });
    } else {
      // Find by participants
      const rooms = await this.prisma.chatRoom.findMany({
        where: {
          isDeleted: false,
          participants: {
            hasEvery: sortedParticipants,
          },
        },
      });

      // Filter to find exact match
      existingRoom = rooms.find(
        (room) =>
          room.participants.length === sortedParticipants.length &&
          room.participants.every((p) => sortedParticipants.includes(p))
      ) || null;
    }

    if (existingRoom) {
      return existingRoom;
    }

    // Create new room
    return this.prisma.chatRoom.create({
      data: {
        participants: sortedParticipants,
        isGroup: body.isGroup || false,
        groupName: body.groupName,
        isSupportChat: body.isSupportChat || false,
        identifierId: body.identifierId,
        identifierType: body.identifierType,
      },
    });
  }

  async getUserRooms(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponseDto<ChatRoomResponseDto>> {
    const where = {
      participants: { has: userId },
      isDeleted: false,
    };

    const totalRecords = await this.prisma.chatRoom.count({ where });

    const rooms = await this.prisma.chatRoom.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: rooms.map((room) => this.mapToRoomResponse(room)),
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }

  async getOneRoom(roomId: string): Promise<ChatRoom | null> {
    return this.prisma.chatRoom.findFirst({
      where: { id: roomId, isDeleted: false },
    });
  }

  async getMessagesForUser(
    roomId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponseDto<MessageResponseDto>> {
    const where = { roomId, isDeleted: false };

    const totalRecords = await this.prisma.chatMessage.count({ where });

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        replyTo: true,
      },
    });

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: messages.map((msg) => this.mapToMessageResponse(msg)),
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }

  async getRoomById(roomId: string): Promise<ChatRoom | null> {
    return this.prisma.chatRoom.findFirst({
      where: { id: roomId, isDeleted: false },
    });
  }

  async markMessageAsRead(
    messageId: string,
    userId: string
  ): Promise<{ message: ChatMessage; room: ChatRoom }> {
    const message = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        senderId: { not: userId },
        isDeleted: false,
        isRead: false,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found or already read');
    }

    const updatedMessage = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isRead: true, readAt: new Date() },
    });

    // Decrement unread count
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: message.roomId },
    });

    if (room) {
      const unreadCounts = (room.unreadCounts as Record<string, number>) || {};
      if (unreadCounts[userId] > 0) {
        unreadCounts[userId] -= 1;
      }

      await this.prisma.chatRoom.update({
        where: { id: room.id },
        data: { unreadCounts },
      });
    }

    const updatedRoom = await this.prisma.chatRoom.findUnique({
      where: { id: message.roomId },
    });

    return { message: updatedMessage, room: updatedRoom! };
  }

  async markRoomAsRead(roomId: string, userId: string): Promise<ChatRoom> {
    // Mark all unread messages as read
    await this.prisma.chatMessage.updateMany({
      where: {
        roomId,
        senderId: { not: userId },
        isRead: false,
        isDeleted: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    // Reset unread count for user
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const unreadCounts = (room.unreadCounts as Record<string, number>) || {};
    unreadCounts[userId] = 0;

    return this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { unreadCounts },
    });
  }

  async editMessage(
    id: string,
    data: EditMessageDto,
    userId: string
  ): Promise<ChatMessage | null> {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id, senderId: userId, isDeleted: false },
    });

    if (!message) {
      return null;
    }

    // Store edit history
    const editHistory = (message.editHistory as any[]) || [];
    editHistory.push({
      content: message.content,
      editedAt: new Date().toISOString(),
    });

    return this.prisma.chatMessage.update({
      where: { id },
      data: {
        content: data.content,
        editHistory,
      },
    });
  }

  async deleteMessage(messageId: string, userId: string): Promise<ChatMessage | null> {
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, senderId: userId, isDeleted: false },
    });

    if (!message) {
      return null;
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async deleteRoom(roomId: string, userId: string): Promise<ChatRoom | null> {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        participants: { has: userId },
        isDeleted: false,
      },
    });

    if (!room) {
      return null;
    }

    return this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async getRoomParticipants(roomId: string): Promise<string[]> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    return room?.participants || [];
  }

  async getUserUnreadChatsCount(userId: string): Promise<{
    totalUnreadChats: number;
    unreadDetails: Array<{ roomId: string; unreadCount: number }>;
  }> {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: { has: userId },
        isDeleted: false,
      },
    });

    const unreadDetails: Array<{ roomId: string; unreadCount: number }> = [];

    for (const room of rooms) {
      const unreadCounts = (room.unreadCounts as Record<string, number>) || {};
      const count = unreadCounts[userId] || 0;
      if (count > 0) {
        unreadDetails.push({ roomId: room.id, unreadCount: count });
      }
    }

    return {
      totalUnreadChats: unreadDetails.length,
      unreadDetails,
    };
  }

  async updateTranslationSettings(
    roomId: string,
    userId: string,
    language: string | null
  ): Promise<ChatRoom> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const translationSettings =
      (room.translationSettings as Record<string, string | null>) || {};
    translationSettings[userId] = language;

    return this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { translationSettings },
    });
  }

  private mapToRoomResponse(room: ChatRoom): ChatRoomResponseDto {
    return {
      id: room.id,
      participants: room.participants,
      isGroup: room.isGroup,
      groupName: room.groupName || undefined,
      isSupportChat: room.isSupportChat,
      status: room.status as ChatRoomStatus,
      unreadCounts: room.unreadCounts as Record<string, number>,
      lastMessagePreview: room.lastMessagePreview || undefined,
      lastMessageAt: room.lastMessageAt,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  private mapToMessageResponse(message: ChatMessage & { replyTo?: ChatMessage | null }): MessageResponseDto {
    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderType: message.senderType as SenderType,
      type: message.type as MessageType,
      content: message.content || undefined,
      fileUrls: message.fileUrls,
      fileName: message.fileName || undefined,
      voiceDuration: message.voiceDuration || undefined,
      isRead: message.isRead,
      readAt: message.readAt || undefined,
      replyToId: message.replyToId || undefined,
      translations: message.translations as Array<{ language: string; text: string }>,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
