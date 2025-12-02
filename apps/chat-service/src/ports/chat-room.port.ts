import { DomainEvent } from '@flexobo/core';
import { ChatRoom, ChatRoomStatus } from '../domain/aggregates/chat-room.aggregate';

// ============================================================
// Chat Room Read Model DTO
// ============================================================

export interface ChatRoomReadModelDto {
  id: string;
  participants: string[];
  isGroup: boolean;
  groupName?: string;
  isSupportChat: boolean;
  status: ChatRoomStatus;
  unreadCounts: Record<string, number>;
  translationSettings: Record<string, { enabled: boolean; targetLanguage: string }>;
  lastMessageId?: string;
  lastMessagePreview?: string;
  lastMessageAt?: Date;
  identifierId?: string;
  identifierType?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  version: number;
  lastEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Chat Room Repository Port (Read Model)
// ============================================================

export interface IChatRoomRepository {
  findById(id: string): Promise<ChatRoomReadModelDto | null>;
  findByParticipants(participantIds: string[]): Promise<ChatRoomReadModelDto | null>;
  findByUserId(userId: string, options?: {
    limit?: number;
    offset?: number;
    includeArchived?: boolean;
  }): Promise<ChatRoomReadModelDto[]>;
  findByIdentifier(identifierId: string, identifierType: string): Promise<ChatRoomReadModelDto | null>;
  countByUserId(userId: string, includeArchived?: boolean): Promise<number>;
  create(room: Omit<ChatRoomReadModelDto, 'createdAt' | 'updatedAt'>): Promise<ChatRoomReadModelDto>;
  update(id: string, data: Partial<ChatRoomReadModelDto>): Promise<ChatRoomReadModelDto>;
  updateUnreadCount(roomId: string, userId: string, count: number): Promise<void>;
  updateLastMessage(roomId: string, messageId: string, preview: string, sentAt: Date): Promise<void>;
  updateTranslationSettings(roomId: string, userId: string, settings: { enabled: boolean; targetLanguage: string }): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export const CHAT_ROOM_REPOSITORY = Symbol('IChatRoomRepository');

// ============================================================
// Chat Room Aggregate Store Port (Event Sourcing)
// ============================================================

export interface IChatRoomAggregateStore {
  load(roomId: string): Promise<ChatRoom | null>;
  exists(roomId: string): Promise<boolean>;
  save(room: ChatRoom): Promise<DomainEvent[]>;
}

export const CHAT_ROOM_AGGREGATE_STORE = Symbol('IChatRoomAggregateStore');
