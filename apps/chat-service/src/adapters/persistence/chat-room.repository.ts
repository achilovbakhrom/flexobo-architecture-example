import { Injectable, Inject } from '@nestjs/common';
import {
  IChatRoomRepository,
  ChatRoomReadModelDto,
} from '../../ports/chat-room.port';
import { ChatRoomStatus } from '../../domain/aggregates/chat-room.aggregate';

interface ChatRoomPrismaClient {
  chatRoom: {
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaChatRoomRepository implements IChatRoomRepository {
  constructor(@Inject('PrismaClient') private readonly prisma: ChatRoomPrismaClient) {}

  async findById(id: string): Promise<ChatRoomReadModelDto | null> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id },
    });

    return room ? this.mapToDto(room) : null;
  }

  async findByParticipants(participantIds: string[]): Promise<ChatRoomReadModelDto | null> {
    // Find a room that has exactly these participants (for 1-on-1 chats)
    const sortedIds = [...participantIds].sort();

    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        isDeleted: false,
        isGroup: false,
      },
    });

    // Find room with exact participant match
    const room = rooms.find((r: any) => {
      const roomParticipants = [...r.participants].sort();
      return (
        roomParticipants.length === sortedIds.length &&
        roomParticipants.every((p: string, i: number) => p === sortedIds[i])
      );
    });

    return room ? this.mapToDto(room) : null;
  }

  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      includeArchived?: boolean;
    }
  ): Promise<ChatRoomReadModelDto[]> {
    const { limit = 50, offset = 0, includeArchived = false } = options || {};

    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: { has: userId },
        isDeleted: false,
        ...(includeArchived ? {} : { status: 'ACTIVE' }),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return rooms.map((room: any) => this.mapToDto(room));
  }

  async findByIdentifier(
    identifierId: string,
    identifierType: string
  ): Promise<ChatRoomReadModelDto | null> {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        identifierId,
        identifierType,
        isDeleted: false,
      },
    });

    return room ? this.mapToDto(room) : null;
  }

  async countByUserId(userId: string, includeArchived = false): Promise<number> {
    return this.prisma.chatRoom.count({
      where: {
        participants: { has: userId },
        isDeleted: false,
        ...(includeArchived ? {} : { status: 'ACTIVE' }),
      },
    });
  }

  async create(
    room: Omit<ChatRoomReadModelDto, 'createdAt' | 'updatedAt'>
  ): Promise<ChatRoomReadModelDto> {
    const created = await this.prisma.chatRoom.create({
      data: {
        id: room.id,
        participants: room.participants,
        isGroup: room.isGroup,
        groupName: room.groupName,
        isSupportChat: room.isSupportChat,
        status: room.status,
        unreadCounts: room.unreadCounts,
        translationSettings: room.translationSettings,
        lastMessageId: room.lastMessageId,
        lastMessagePreview: room.lastMessagePreview,
        lastMessageAt: room.lastMessageAt,
        identifierId: room.identifierId,
        identifierType: room.identifierType,
        isDeleted: room.isDeleted,
        deletedAt: room.deletedAt,
        version: room.version,
        lastEventId: room.lastEventId,
      },
    });

    return this.mapToDto(created);
  }

  async update(
    id: string,
    data: Partial<ChatRoomReadModelDto>
  ): Promise<ChatRoomReadModelDto> {
    const updated = await this.prisma.chatRoom.update({
      where: { id },
      data: {
        ...(data.participants !== undefined && { participants: data.participants }),
        ...(data.isGroup !== undefined && { isGroup: data.isGroup }),
        ...(data.groupName !== undefined && { groupName: data.groupName }),
        ...(data.isSupportChat !== undefined && { isSupportChat: data.isSupportChat }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.unreadCounts !== undefined && { unreadCounts: data.unreadCounts }),
        ...(data.translationSettings !== undefined && { translationSettings: data.translationSettings }),
        ...(data.lastMessageId !== undefined && { lastMessageId: data.lastMessageId }),
        ...(data.lastMessagePreview !== undefined && { lastMessagePreview: data.lastMessagePreview }),
        ...(data.lastMessageAt !== undefined && { lastMessageAt: data.lastMessageAt }),
        ...(data.identifierId !== undefined && { identifierId: data.identifierId }),
        ...(data.identifierType !== undefined && { identifierType: data.identifierType }),
        ...(data.isDeleted !== undefined && { isDeleted: data.isDeleted }),
        ...(data.deletedAt !== undefined && { deletedAt: data.deletedAt }),
        ...(data.version !== undefined && { version: data.version }),
        ...(data.lastEventId !== undefined && { lastEventId: data.lastEventId }),
      },
    });

    return this.mapToDto(updated);
  }

  async updateUnreadCount(roomId: string, userId: string, count: number): Promise<void> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (room) {
      const unreadCounts = (room.unreadCounts as Record<string, number>) || {};
      unreadCounts[userId] = count;

      await this.prisma.chatRoom.update({
        where: { id: roomId },
        data: { unreadCounts },
      });
    }
  }

  async updateLastMessage(
    roomId: string,
    messageId: string,
    preview: string,
    sentAt: Date
  ): Promise<void> {
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        lastMessageId: messageId,
        lastMessagePreview: preview,
        lastMessageAt: sentAt,
      },
    });
  }

  async updateTranslationSettings(
    roomId: string,
    userId: string,
    settings: { enabled: boolean; targetLanguage: string }
  ): Promise<void> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (room) {
      const translationSettings = (room.translationSettings as Record<string, any>) || {};
      translationSettings[userId] = settings;

      await this.prisma.chatRoom.update({
        where: { id: roomId },
        data: { translationSettings },
      });
    }
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.chatRoom.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  private mapToDto(room: any): ChatRoomReadModelDto {
    return {
      id: room.id,
      participants: room.participants,
      isGroup: room.isGroup,
      groupName: room.groupName,
      isSupportChat: room.isSupportChat,
      status: room.status as ChatRoomStatus,
      unreadCounts: (room.unreadCounts as Record<string, number>) || {},
      translationSettings: (room.translationSettings as Record<string, { enabled: boolean; targetLanguage: string }>) || {},
      lastMessageId: room.lastMessageId,
      lastMessagePreview: room.lastMessagePreview,
      lastMessageAt: room.lastMessageAt,
      identifierId: room.identifierId,
      identifierType: room.identifierType,
      isDeleted: room.isDeleted,
      deletedAt: room.deletedAt,
      version: room.version,
      lastEventId: room.lastEventId,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }
}
