import { DomainEvent } from '@flexobo/core';
import { ChatMessage, MessageType, MessageStatus, SenderType } from '../domain/aggregates/chat-message.aggregate';

export interface ChatMessageReadModelDto {
  id: string;
  roomId: string;
  senderId: string;
  senderType: SenderType;
  type: MessageType;
  content?: string;
  fileUrls: string[];
  fileName?: string;
  fileMetadata?: Record<string, unknown>;
  voiceDuration?: number;
  status: MessageStatus;
  isRead: boolean;
  readAt?: Date;
  replyToId?: string;
  translations: Array<{ language: string; content: string; translatedAt: Date }>;
  editHistory: Array<{ previousContent: string; editedAt: Date; editedBy: string }>;
  isDeleted: boolean;
  deletedAt?: Date;
  version: number;
  lastEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMessageRepository {
  findById(id: string): Promise<ChatMessageReadModelDto | null>;
  findByRoomId(roomId: string, options?: {
    limit?: number;
    offset?: number;
    beforeId?: string;
    afterId?: string;
  }): Promise<ChatMessageReadModelDto[]>;
  countByRoomId(roomId: string): Promise<number>;
  countUnreadByRoomAndUser(roomId: string, userId: string): Promise<number>;
  create(message: Omit<ChatMessageReadModelDto, 'createdAt' | 'updatedAt'>): Promise<ChatMessageReadModelDto>;
  update(id: string, data: Partial<ChatMessageReadModelDto>): Promise<ChatMessageReadModelDto>;
  markAsRead(id: string, readAt: Date): Promise<void>;
  markAllAsReadInRoom(roomId: string, userId: string, readAt: Date): Promise<number>;
  softDelete(id: string): Promise<void>;
}

export const CHAT_MESSAGE_REPOSITORY = Symbol('IChatMessageRepository');

export interface IChatMessageAggregateStore {
  load(messageId: string): Promise<ChatMessage | null>;
  exists(messageId: string): Promise<boolean>;
  save(message: ChatMessage): Promise<DomainEvent[]>;
}

export const CHAT_MESSAGE_AGGREGATE_STORE = Symbol('IChatMessageAggregateStore');
