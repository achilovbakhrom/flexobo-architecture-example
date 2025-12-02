import { v4 as uuid } from 'uuid';
import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  ChatMessageEventType,
  ChatMessageEvent,
  ChatMessageSentEvent,
  ChatMessageDeliveredEvent,
  ChatMessageReadEvent,
  ChatMessageEditedEvent,
  ChatMessageDeletedEvent,
  ChatMessageTranslationAddedEvent,
} from '../events/chat.events';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  VOICE = 'VOICE',
  GIF = 'GIF',
  STATUS = 'STATUS',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export enum SenderType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}

export interface EditHistoryEntry {
  previousContent: string;
  editedAt: Date;
  editedBy: string;
}

export interface TranslationEntry {
  language: string;
  content: string;
  translatedAt: Date;
}

export interface ChatMessageSnapshotData {
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
  translations: TranslationEntry[];
  editHistory: EditHistoryEntry[];
  isDeleted: boolean;
  deletedAt?: Date;
}

export class ChatMessage extends AggregateRoot {
  private _roomId!: string;
  private _senderId!: string;
  private _senderType!: SenderType;
  private _type: MessageType = MessageType.TEXT;
  private _content?: string;
  private _fileUrls: string[] = [];
  private _fileName?: string;
  private _fileMetadata?: Record<string, unknown>;
  private _voiceDuration?: number;
  private _status: MessageStatus = MessageStatus.SENT;
  private _isRead = false;
  private _readAt?: Date;
  private _replyToId?: string;
  private _translations: TranslationEntry[] = [];
  private _editHistory: EditHistoryEntry[] = [];
  private _isDeleted = false;
  private _deletedAt?: Date;

  // Getters
  get roomId(): string {
    return this._roomId;
  }
  get senderId(): string {
    return this._senderId;
  }
  get senderType(): SenderType {
    return this._senderType;
  }
  get type(): MessageType {
    return this._type;
  }
  get content(): string | undefined {
    return this._content;
  }
  get fileUrls(): string[] {
    return [...this._fileUrls];
  }
  get fileName(): string | undefined {
    return this._fileName;
  }
  get fileMetadata(): Record<string, unknown> | undefined {
    return this._fileMetadata;
  }
  get voiceDuration(): number | undefined {
    return this._voiceDuration;
  }
  get status(): MessageStatus {
    return this._status;
  }
  get isRead(): boolean {
    return this._isRead;
  }
  get readAt(): Date | undefined {
    return this._readAt;
  }
  get replyToId(): string | undefined {
    return this._replyToId;
  }
  get translations(): TranslationEntry[] {
    return [...this._translations];
  }
  get editHistory(): EditHistoryEntry[] {
    return [...this._editHistory];
  }
  get isDeleted(): boolean {
    return this._isDeleted;
  }
  get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  // Factory methods
  static create(data: {
    roomId: string;
    senderId: string;
    senderType: SenderType;
    type?: MessageType;
    content?: string;
    fileUrls?: string[];
    fileName?: string;
    fileMetadata?: Record<string, unknown>;
    voiceDuration?: number;
    replyToId?: string;
  }): ChatMessage {
    const message = new ChatMessage(uuid());
    message.sendMessage(data);
    return message;
  }

  static send(data: {
    roomId: string;
    senderId: string;
    senderType: SenderType;
    type?: MessageType;
    content?: string;
    fileUrls?: string[];
    fileName?: string;
    fileMetadata?: Record<string, unknown>;
    voiceDuration?: number;
    replyToId?: string;
  }): ChatMessage {
    return ChatMessage.create(data);
  }

  static fromEvents(events: DomainEvent[]): ChatMessage {
    if (events.length === 0) {
      throw new Error('Cannot create ChatMessage from empty events');
    }
    const message = new ChatMessage(events[0].aggregateId);
    message.loadFromHistory(events);
    return message;
  }

  static fromSnapshot(
    snapshotData: ChatMessageSnapshotData,
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): ChatMessage {
    const message = new ChatMessage(snapshotData.id);
    message._roomId = snapshotData.roomId;
    message._senderId = snapshotData.senderId;
    message._senderType = snapshotData.senderType;
    message._type = snapshotData.type;
    message._content = snapshotData.content;
    message._fileUrls = snapshotData.fileUrls;
    message._fileName = snapshotData.fileName;
    message._fileMetadata = snapshotData.fileMetadata;
    message._voiceDuration = snapshotData.voiceDuration;
    message._status = snapshotData.status;
    message._isRead = snapshotData.isRead;
    message._readAt = snapshotData.readAt;
    message._replyToId = snapshotData.replyToId;
    message._translations = snapshotData.translations;
    message._editHistory = snapshotData.editHistory;
    message._isDeleted = snapshotData.isDeleted;
    message._deletedAt = snapshotData.deletedAt;
    message._version = snapshotVersion;

    if (subsequentEvents.length > 0) {
      message.loadFromHistory(subsequentEvents);
    }

    return message;
  }

  toSnapshot(): ChatMessageSnapshotData {
    return {
      id: this.id,
      roomId: this._roomId,
      senderId: this._senderId,
      senderType: this._senderType,
      type: this._type,
      content: this._content,
      fileUrls: this._fileUrls,
      fileName: this._fileName,
      fileMetadata: this._fileMetadata,
      voiceDuration: this._voiceDuration,
      status: this._status,
      isRead: this._isRead,
      readAt: this._readAt,
      replyToId: this._replyToId,
      translations: this._translations,
      editHistory: this._editHistory,
      isDeleted: this._isDeleted,
      deletedAt: this._deletedAt,
    };
  }

  // Domain commands
  private sendMessage(data: {
    roomId: string;
    senderId: string;
    senderType: SenderType;
    type?: MessageType;
    content?: string;
    fileUrls?: string[];
    fileName?: string;
    fileMetadata?: Record<string, unknown>;
    voiceDuration?: number;
    replyToId?: string;
  }): void {
    const event = this.createEvent(ChatMessageEventType.Sent, {
      roomId: data.roomId,
      senderId: data.senderId,
      senderType: data.senderType,
      messageType: data.type || MessageType.TEXT,
      content: data.content,
      fileUrls: data.fileUrls,
      fileName: data.fileName,
      fileMetadata: data.fileMetadata,
      voiceDuration: data.voiceDuration,
      replyToId: data.replyToId,
      sentAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  markAsDelivered(deliveredTo: string): void {
    if (this._status === MessageStatus.READ) {
      return; // Already read, no need to mark as delivered
    }

    const event = this.createEvent(ChatMessageEventType.Delivered, {
      deliveredTo,
      deliveredAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  markAsRead(readBy: string): void {
    if (this._isRead) {
      return; // Already read
    }

    const event = this.createEvent(ChatMessageEventType.Read, {
      readBy,
      readAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  edit(newContent: string, editedBy: string): void {
    if (this._isDeleted) {
      throw new Error('Cannot edit deleted message');
    }

    if (editedBy !== this._senderId) {
      throw new Error('Only sender can edit message');
    }

    if (this._type !== MessageType.TEXT) {
      throw new Error('Can only edit text messages');
    }

    const event = this.createEvent(ChatMessageEventType.Edited, {
      previousContent: this._content || '',
      newContent,
      editedBy,
      editedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  delete(deletedBy: string): void {
    if (this._isDeleted) {
      throw new Error('Message is already deleted');
    }

    const event = this.createEvent(ChatMessageEventType.Deleted, {
      deletedBy,
      deletedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  addTranslation(language: string, translatedContent: string): void {
    if (this._isDeleted) {
      throw new Error('Cannot add translation to deleted message');
    }

    const event = this.createEvent(ChatMessageEventType.TranslationAdded, {
      language,
      translatedContent,
      translatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  // Event handlers
  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case ChatMessageEventType.Sent:
        this.applySent(event.data as ChatMessageSentEvent['data']);
        break;
      case ChatMessageEventType.Delivered:
        this._status = MessageStatus.DELIVERED;
        break;
      case ChatMessageEventType.Read:
        this.applyRead(event.data as ChatMessageReadEvent['data']);
        break;
      case ChatMessageEventType.Edited:
        this.applyEdited(event.data as ChatMessageEditedEvent['data']);
        break;
      case ChatMessageEventType.Deleted:
        this._isDeleted = true;
        this._deletedAt = (event.data as ChatMessageDeletedEvent['data']).deletedAt;
        break;
      case ChatMessageEventType.TranslationAdded:
        this.applyTranslationAdded(event.data as ChatMessageTranslationAddedEvent['data']);
        break;
    }
  }

  private applySent(data: ChatMessageSentEvent['data']): void {
    this._roomId = data.roomId;
    this._senderId = data.senderId;
    this._senderType = data.senderType as SenderType;
    this._type = data.messageType as MessageType;
    this._content = data.content;
    this._fileUrls = data.fileUrls || [];
    this._fileName = data.fileName;
    this._fileMetadata = data.fileMetadata;
    this._voiceDuration = data.voiceDuration;
    this._replyToId = data.replyToId;
    this._status = MessageStatus.SENT;
  }

  private applyRead(data: ChatMessageReadEvent['data']): void {
    this._status = MessageStatus.READ;
    this._isRead = true;
    this._readAt = data.readAt;
  }

  private applyEdited(data: ChatMessageEditedEvent['data']): void {
    this._editHistory.push({
      previousContent: data.previousContent,
      editedAt: data.editedAt,
      editedBy: data.editedBy,
    });
    this._content = data.newContent;
  }

  private applyTranslationAdded(data: ChatMessageTranslationAddedEvent['data']): void {
    // Remove existing translation for this language if exists
    this._translations = this._translations.filter((t) => t.language !== data.language);
    this._translations.push({
      language: data.language,
      content: data.translatedContent,
      translatedAt: data.translatedAt,
    });
  }

  // State accessor for handlers
  getState(): {
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
    translations: TranslationEntry[];
    editHistory: EditHistoryEntry[];
    isDeleted: boolean;
    deletedAt?: Date;
  } {
    return {
      roomId: this._roomId,
      senderId: this._senderId,
      senderType: this._senderType,
      type: this._type,
      content: this._content,
      fileUrls: [...this._fileUrls],
      fileName: this._fileName,
      fileMetadata: this._fileMetadata,
      voiceDuration: this._voiceDuration,
      status: this._status,
      isRead: this._isRead,
      readAt: this._readAt,
      replyToId: this._replyToId,
      translations: [...this._translations],
      editHistory: [...this._editHistory],
      isDeleted: this._isDeleted,
      deletedAt: this._deletedAt,
    };
  }

  // Helper methods
  getTranslation(language: string): TranslationEntry | undefined {
    return this._translations.find((t) => t.language === language);
  }

  getPreview(): string {
    if (this._content) {
      return this._content.substring(0, 100);
    }
    if (this._type === MessageType.IMAGE) return '[Image]';
    if (this._type === MessageType.FILE) return `[File: ${this._fileName || 'file'}]`;
    if (this._type === MessageType.VIDEO) return '[Video]';
    if (this._type === MessageType.AUDIO) return '[Audio]';
    if (this._type === MessageType.VOICE) return '[Voice message]';
    if (this._type === MessageType.GIF) return '[GIF]';
    return '[Message]';
  }
}
