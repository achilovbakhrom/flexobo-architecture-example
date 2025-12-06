import { v4 as uuid } from 'uuid';
import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  ChatRoomEventType,
  ChatRoomEvent,
  ChatRoomCreatedEvent,
  ChatRoomMessageAddedEvent,
  ChatRoomUnreadCountUpdatedEvent,
  ChatRoomTranslationSettingsUpdatedEvent,
  ChatRoomArchivedEvent,
  ChatRoomClosedEvent,
  ChatRoomDeletedEvent,
  ChatRoomParticipantAddedEvent,
  ChatRoomParticipantRemovedEvent,
} from '../events/chat.events';

export enum ChatRoomStatus {
  Active = 'active',
  Archived = 'archived',
  Closed = 'closed',
}

export interface TranslationSettings {
  enabled: boolean;
  targetLanguage: string;
}

export interface ChatRoomSnapshotData {
  id: string;
  participants: string[];
  isGroup: boolean;
  groupName?: string;
  isSupportChat: boolean;
  status: ChatRoomStatus;
  unreadCounts: Record<string, number>;
  translationSettings: Record<string, TranslationSettings>;
  lastMessageId?: string;
  lastMessagePreview?: string;
  lastMessageAt?: Date;
  identifierId?: string;
  identifierType?: string;
  isDeleted: boolean;
  deletedAt?: Date;
}

export class ChatRoom extends AggregateRoot {
  private _participants: string[] = [];
  private _isGroup = false;
  private _groupName?: string;
  private _isSupportChat = false;
  private _status: ChatRoomStatus = ChatRoomStatus.Active;
  private _unreadCounts: Record<string, number> = {};
  private _translationSettings: Record<string, TranslationSettings> = {};
  private _lastMessageId?: string;
  private _lastMessagePreview?: string;
  private _lastMessageAt?: Date;
  private _identifierId?: string;
  private _identifierType?: string;
  private _isDeleted = false;
  private _deletedAt?: Date;

  // Getters
  get participants(): string[] {
    return [...this._participants];
  }
  get isGroup(): boolean {
    return this._isGroup;
  }
  get groupName(): string | undefined {
    return this._groupName;
  }
  get isSupportChat(): boolean {
    return this._isSupportChat;
  }
  get status(): ChatRoomStatus {
    return this._status;
  }
  get unreadCounts(): Record<string, number> {
    return { ...this._unreadCounts };
  }
  get translationSettings(): Record<string, TranslationSettings> {
    return { ...this._translationSettings };
  }
  get lastMessageId(): string | undefined {
    return this._lastMessageId;
  }
  get lastMessagePreview(): string | undefined {
    return this._lastMessagePreview;
  }
  get lastMessageAt(): Date | undefined {
    return this._lastMessageAt;
  }
  get identifierId(): string | undefined {
    return this._identifierId;
  }
  get identifierType(): string | undefined {
    return this._identifierType;
  }
  get isDeleted(): boolean {
    return this._isDeleted;
  }
  get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  // Factory methods
  static create(data: {
    participants: string[];
    isGroup?: boolean;
    groupName?: string;
    isSupportChat?: boolean;
    identifierId?: string;
    identifierType?: string;
    createdBy: string;
  }): ChatRoom {
    const room = new ChatRoom(uuid());
    room.createRoom(data);
    return room;
  }

  static fromEvents(events: DomainEvent[]): ChatRoom {
    if (events.length === 0) {
      throw new Error('Cannot create ChatRoom from empty events');
    }
    const room = new ChatRoom(events[0].aggregateId);
    room.loadFromHistory(events);
    return room;
  }

  static fromSnapshot(
    snapshotData: ChatRoomSnapshotData,
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): ChatRoom {
    const room = new ChatRoom(snapshotData.id);
    room._participants = snapshotData.participants;
    room._isGroup = snapshotData.isGroup;
    room._groupName = snapshotData.groupName;
    room._isSupportChat = snapshotData.isSupportChat;
    room._status = snapshotData.status;
    room._unreadCounts = snapshotData.unreadCounts;
    room._translationSettings = snapshotData.translationSettings;
    room._lastMessageId = snapshotData.lastMessageId;
    room._lastMessagePreview = snapshotData.lastMessagePreview;
    room._lastMessageAt = snapshotData.lastMessageAt;
    room._identifierId = snapshotData.identifierId;
    room._identifierType = snapshotData.identifierType;
    room._isDeleted = snapshotData.isDeleted;
    room._deletedAt = snapshotData.deletedAt;
    room._version = snapshotVersion;

    if (subsequentEvents.length > 0) {
      room.loadFromHistory(subsequentEvents);
    }

    return room;
  }

  toSnapshot(): ChatRoomSnapshotData {
    return {
      id: this.id,
      participants: this._participants,
      isGroup: this._isGroup,
      groupName: this._groupName,
      isSupportChat: this._isSupportChat,
      status: this._status,
      unreadCounts: this._unreadCounts,
      translationSettings: this._translationSettings,
      lastMessageId: this._lastMessageId,
      lastMessagePreview: this._lastMessagePreview,
      lastMessageAt: this._lastMessageAt,
      identifierId: this._identifierId,
      identifierType: this._identifierType,
      isDeleted: this._isDeleted,
      deletedAt: this._deletedAt,
    };
  }

  // Domain commands
  private createRoom(data: {
    participants: string[];
    isGroup?: boolean;
    groupName?: string;
    isSupportChat?: boolean;
    identifierId?: string;
    identifierType?: string;
    createdBy: string;
  }): void {
    const event = this.createEvent(ChatRoomEventType.Created, {
      participants: data.participants,
      isGroup: data.isGroup ?? false,
      groupName: data.groupName,
      isSupportChat: data.isSupportChat ?? false,
      identifierId: data.identifierId,
      identifierType: data.identifierType,
      createdBy: data.createdBy,
    });
    this.addEvent(event);
    this.apply(event);
  }

  addParticipant(userId: string, addedBy: string): void {
    if (this._participants.includes(userId)) {
      throw new Error('User is already a participant');
    }

    const event = this.createEvent(ChatRoomEventType.ParticipantAdded, {
      userId,
      addedBy,
      addedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  removeParticipant(userId: string, removedBy: string): void {
    if (!this._participants.includes(userId)) {
      throw new Error('User is not a participant');
    }

    const event = this.createEvent(ChatRoomEventType.ParticipantRemoved, {
      userId,
      removedBy,
      removedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  addMessage(messageId: string, preview: string, senderId: string): void {
    const event = this.createEvent(ChatRoomEventType.MessageAdded, {
      messageId,
      senderId,
      preview: preview.substring(0, 100),
      sentAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);

    // Increment unread for all participants except sender
    for (const participantId of this._participants) {
      if (participantId !== senderId) {
        this.incrementUnreadCount(participantId);
      }
    }
  }

  private incrementUnreadCount(userId: string): void {
    const currentCount = this._unreadCounts[userId] || 0;
    const event = this.createEvent(ChatRoomEventType.UnreadCountUpdated, {
      userId,
      count: currentCount + 1,
      updatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  markAsRead(userId: string): void {
    if (this._unreadCounts[userId] === 0) {
      return; // Already read
    }

    const event = this.createEvent(ChatRoomEventType.UnreadCountUpdated, {
      userId,
      count: 0,
      updatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  updateTranslationSettings(
    userId: string,
    enabled: boolean,
    targetLanguage: string
  ): void {
    const event = this.createEvent(ChatRoomEventType.TranslationSettingsUpdated, {
      userId,
      settings: { enabled, targetLanguage },
      updatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  archive(archivedBy: string): void {
    if (this._status !== ChatRoomStatus.Active) {
      throw new Error('Can only archive active rooms');
    }

    const event = this.createEvent(ChatRoomEventType.Archived, {
      archivedBy,
      archivedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  close(closedBy: string): void {
    if (this._status === ChatRoomStatus.Closed) {
      throw new Error('Room is already closed');
    }

    const event = this.createEvent(ChatRoomEventType.Closed, {
      closedBy,
      closedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  delete(deletedBy: string): void {
    if (this._isDeleted) {
      throw new Error('Room is already deleted');
    }

    const event = this.createEvent(ChatRoomEventType.Deleted, {
      deletedBy,
      deletedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  // Event handlers
  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case ChatRoomEventType.Created:
        this.applyCreated(event.data as ChatRoomCreatedEvent['data']);
        break;
      case ChatRoomEventType.ParticipantAdded:
        this.applyParticipantAdded(event.data as ChatRoomParticipantAddedEvent['data']);
        break;
      case ChatRoomEventType.ParticipantRemoved:
        this.applyParticipantRemoved(event.data as ChatRoomParticipantRemovedEvent['data']);
        break;
      case ChatRoomEventType.MessageAdded:
        this.applyMessageAdded(event.data as ChatRoomMessageAddedEvent['data']);
        break;
      case ChatRoomEventType.UnreadCountUpdated:
        this.applyUnreadCountUpdated(event.data as ChatRoomUnreadCountUpdatedEvent['data']);
        break;
      case ChatRoomEventType.TranslationSettingsUpdated:
        this.applyTranslationSettingsUpdated(
          event.data as ChatRoomTranslationSettingsUpdatedEvent['data']
        );
        break;
      case ChatRoomEventType.Archived:
        this._status = ChatRoomStatus.Archived;
        break;
      case ChatRoomEventType.Closed:
        this._status = ChatRoomStatus.Closed;
        break;
      case ChatRoomEventType.Deleted:
        this._isDeleted = true;
        this._deletedAt = (event.data as ChatRoomDeletedEvent['data']).deletedAt;
        break;
    }
  }

  private applyCreated(data: ChatRoomCreatedEvent['data']): void {
    this._participants = data.participants;
    this._isGroup = data.isGroup;
    this._groupName = data.groupName;
    this._isSupportChat = data.isSupportChat;
    this._identifierId = data.identifierId;
    this._identifierType = data.identifierType;
    this._status = ChatRoomStatus.Active;
    this._unreadCounts = {};
    this._translationSettings = {};
  }

  private applyParticipantAdded(data: ChatRoomParticipantAddedEvent['data']): void {
    if (!this._participants.includes(data.userId)) {
      this._participants.push(data.userId);
    }
  }

  private applyParticipantRemoved(data: ChatRoomParticipantRemovedEvent['data']): void {
    this._participants = this._participants.filter((p) => p !== data.userId);
    delete this._unreadCounts[data.userId];
    delete this._translationSettings[data.userId];
  }

  private applyMessageAdded(data: ChatRoomMessageAddedEvent['data']): void {
    this._lastMessageId = data.messageId;
    this._lastMessagePreview = data.preview;
    this._lastMessageAt = data.sentAt;
  }

  private applyUnreadCountUpdated(data: ChatRoomUnreadCountUpdatedEvent['data']): void {
    this._unreadCounts[data.userId] = data.count;
  }

  private applyTranslationSettingsUpdated(
    data: ChatRoomTranslationSettingsUpdatedEvent['data']
  ): void {
    this._translationSettings[data.userId] = data.settings;
  }

  // State accessor for handlers
  getState(): {
    participants: string[];
    isGroup: boolean;
    groupName?: string;
    isSupportChat: boolean;
    status: ChatRoomStatus;
    unreadCounts: Record<string, number>;
    translationSettings: Record<string, TranslationSettings>;
    lastMessageId?: string;
    lastMessagePreview?: string;
    lastMessageAt?: Date;
    identifierId?: string;
    identifierType?: string;
    isDeleted: boolean;
    deletedAt?: Date;
  } {
    return {
      participants: [...this._participants],
      isGroup: this._isGroup,
      groupName: this._groupName,
      isSupportChat: this._isSupportChat,
      status: this._status,
      unreadCounts: { ...this._unreadCounts },
      translationSettings: { ...this._translationSettings },
      lastMessageId: this._lastMessageId,
      lastMessagePreview: this._lastMessagePreview,
      lastMessageAt: this._lastMessageAt,
      identifierId: this._identifierId,
      identifierType: this._identifierType,
      isDeleted: this._isDeleted,
      deletedAt: this._deletedAt,
    };
  }

  // Helper methods
  isParticipant(userId: string): boolean {
    return this._participants.includes(userId);
  }

  getUnreadCount(userId: string): number {
    return this._unreadCounts[userId] || 0;
  }

  getTranslationSettings(userId: string): TranslationSettings | undefined {
    return this._translationSettings[userId];
  }
}
