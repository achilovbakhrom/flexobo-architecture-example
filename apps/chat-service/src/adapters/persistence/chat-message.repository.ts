import { Injectable, Inject } from '@nestjs/common';
import {
  IChatMessageRepository,
  ChatMessageReadModelDto,
} from '../../ports/chat-message.port';
import { MessageType, MessageStatus, SenderType } from '../../domain/aggregates/chat-message.aggregate';

interface ChatMessagePrismaClient {
  chatMessage: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    updateMany: (args: any) => Promise<{ count: number }>;
  };
}

@Injectable()
export class PrismaChatMessageRepository implements IChatMessageRepository {
  constructor(@Inject('PrismaClient') private readonly prisma: ChatMessagePrismaClient) {}

  async findById(id: string): Promise<ChatMessageReadModelDto | null> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id },
    });

    return message ? this.mapToDto(message) : null;
  }

  async findByRoomId(
    roomId: string,
    options?: {
      limit?: number;
      offset?: number;
      beforeId?: string;
      afterId?: string;
    }
  ): Promise<ChatMessageReadModelDto[]> {
    const { limit = 50, offset = 0, beforeId, afterId } = options || {};

    let cursor: any = undefined;
    let cursorDirection: 'before' | 'after' | undefined = undefined;

    if (beforeId) {
      cursor = { id: beforeId };
      cursorDirection = 'before';
    } else if (afterId) {
      cursor = { id: afterId };
      cursorDirection = 'after';
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false,
        ...(cursorDirection === 'before' && cursor
          ? {
              createdAt: {
                lt: (await this.prisma.chatMessage.findUnique({ where: { id: beforeId } }))?.createdAt,
              },
            }
          : {}),
        ...(cursorDirection === 'after' && cursor
          ? {
              createdAt: {
                gt: (await this.prisma.chatMessage.findUnique({ where: { id: afterId } }))?.createdAt,
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: cursor ? 0 : offset,
    });

    return messages.map((msg: any) => this.mapToDto(msg));
  }

  async countByRoomId(roomId: string): Promise<number> {
    return this.prisma.chatMessage.count({
      where: {
        roomId,
        isDeleted: false,
      },
    });
  }

  async countUnreadByRoomAndUser(roomId: string, userId: string): Promise<number> {
    return this.prisma.chatMessage.count({
      where: {
        roomId,
        isDeleted: false,
        isRead: false,
        senderId: { not: userId },
      },
    });
  }

  async create(
    message: Omit<ChatMessageReadModelDto, 'createdAt' | 'updatedAt'>
  ): Promise<ChatMessageReadModelDto> {
    const created = await this.prisma.chatMessage.create({
      data: {
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        senderType: message.senderType,
        type: message.type,
        content: message.content,
        fileUrls: message.fileUrls,
        fileName: message.fileName,
        fileMetadata: message.fileMetadata,
        voiceDuration: message.voiceDuration,
        status: message.status,
        isRead: message.isRead,
        readAt: message.readAt,
        replyToId: message.replyToId,
        translations: message.translations,
        editHistory: message.editHistory,
        isDeleted: message.isDeleted,
        deletedAt: message.deletedAt,
        version: message.version,
        lastEventId: message.lastEventId,
      },
    });

    return this.mapToDto(created);
  }

  async update(
    id: string,
    data: Partial<ChatMessageReadModelDto>
  ): Promise<ChatMessageReadModelDto> {
    const updated = await this.prisma.chatMessage.update({
      where: { id },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.fileUrls !== undefined && { fileUrls: data.fileUrls }),
        ...(data.fileName !== undefined && { fileName: data.fileName }),
        ...(data.fileMetadata !== undefined && { fileMetadata: data.fileMetadata }),
        ...(data.voiceDuration !== undefined && { voiceDuration: data.voiceDuration }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.isRead !== undefined && { isRead: data.isRead }),
        ...(data.readAt !== undefined && { readAt: data.readAt }),
        ...(data.translations !== undefined && { translations: data.translations }),
        ...(data.editHistory !== undefined && { editHistory: data.editHistory }),
        ...(data.isDeleted !== undefined && { isDeleted: data.isDeleted }),
        ...(data.deletedAt !== undefined && { deletedAt: data.deletedAt }),
        ...(data.version !== undefined && { version: data.version }),
        ...(data.lastEventId !== undefined && { lastEventId: data.lastEventId }),
      },
    });

    return this.mapToDto(updated);
  }

  async markAsRead(id: string, readAt: Date): Promise<void> {
    await this.prisma.chatMessage.update({
      where: { id },
      data: {
        isRead: true,
        readAt,
        status: 'READ',
      },
    });
  }

  async markAllAsReadInRoom(roomId: string, userId: string, readAt: Date): Promise<number> {
    const result = await this.prisma.chatMessage.updateMany({
      where: {
        roomId,
        isDeleted: false,
        isRead: false,
        senderId: { not: userId },
      },
      data: {
        isRead: true,
        readAt,
        status: 'READ',
      },
    });

    return result.count;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.chatMessage.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  private mapToDto(message: any): ChatMessageReadModelDto {
    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderType: message.senderType as SenderType,
      type: message.type as MessageType,
      content: message.content,
      fileUrls: message.fileUrls || [],
      fileName: message.fileName,
      fileMetadata: message.fileMetadata as Record<string, unknown> | undefined,
      voiceDuration: message.voiceDuration,
      status: message.status as MessageStatus,
      isRead: message.isRead,
      readAt: message.readAt,
      replyToId: message.replyToId,
      translations: (message.translations as Array<{ language: string; content: string; translatedAt: Date }>) || [],
      editHistory: (message.editHistory as Array<{ previousContent: string; editedAt: Date; editedBy: string }>) || [],
      isDeleted: message.isDeleted,
      deletedAt: message.deletedAt,
      version: message.version,
      lastEventId: message.lastEventId,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
