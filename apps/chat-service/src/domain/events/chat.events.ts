// Chat Room Events
export enum ChatRoomEventType {
  Created = 'chat_room.created',
  ParticipantAdded = 'chat_room.participant_added',
  ParticipantRemoved = 'chat_room.participant_removed',
  MessageAdded = 'chat_room.message_added',
  LastMessageUpdated = 'chat_room.last_message_updated',
  UnreadCountUpdated = 'chat_room.unread_count_updated',
  TranslationSettingsUpdated = 'chat_room.translation_settings_updated',
  Archived = 'chat_room.archived',
  Closed = 'chat_room.closed',
  Deleted = 'chat_room.deleted',
}

// Chat Message Events
export enum ChatMessageEventType {
  Sent = 'chat_message.sent',
  Delivered = 'chat_message.delivered',
  Read = 'chat_message.read',
  Edited = 'chat_message.edited',
  Deleted = 'chat_message.deleted',
  TranslationAdded = 'chat_message.translation_added',
}

// Chat Room Event Data Types
export interface ChatRoomCreatedEvent {
  type: ChatRoomEventType.Created;
  data: {
    participants: string[];
    isGroup: boolean;
    groupName?: string;
    isSupportChat: boolean;
    identifierId?: string;
    identifierType?: string;
    createdBy: string;
  };
}

export interface ChatRoomParticipantAddedEvent {
  type: ChatRoomEventType.ParticipantAdded;
  data: {
    userId: string;
    addedBy: string;
    addedAt: Date;
  };
}

export interface ChatRoomParticipantRemovedEvent {
  type: ChatRoomEventType.ParticipantRemoved;
  data: {
    userId: string;
    removedBy: string;
    removedAt: Date;
  };
}

export interface ChatRoomMessageAddedEvent {
  type: ChatRoomEventType.MessageAdded;
  data: {
    messageId: string;
    senderId: string;
    preview: string;
    sentAt: Date;
  };
}

export interface ChatRoomUnreadCountUpdatedEvent {
  type: ChatRoomEventType.UnreadCountUpdated;
  data: {
    userId: string;
    count: number;
    updatedAt: Date;
  };
}

export interface ChatRoomTranslationSettingsUpdatedEvent {
  type: ChatRoomEventType.TranslationSettingsUpdated;
  data: {
    userId: string;
    settings: {
      enabled: boolean;
      targetLanguage: string;
    };
    updatedAt: Date;
  };
}

export interface ChatRoomArchivedEvent {
  type: ChatRoomEventType.Archived;
  data: {
    archivedBy: string;
    archivedAt: Date;
  };
}

export interface ChatRoomClosedEvent {
  type: ChatRoomEventType.Closed;
  data: {
    closedBy: string;
    closedAt: Date;
  };
}

export interface ChatRoomDeletedEvent {
  type: ChatRoomEventType.Deleted;
  data: {
    deletedBy: string;
    deletedAt: Date;
  };
}

// Chat Message Event Data Types
export interface ChatMessageSentEvent {
  type: ChatMessageEventType.Sent;
  data: {
    roomId: string;
    senderId: string;
    senderType: string;
    messageType: string;
    content?: string;
    fileUrls?: string[];
    fileName?: string;
    fileMetadata?: Record<string, unknown>;
    voiceDuration?: number;
    replyToId?: string;
    sentAt: Date;
  };
}

export interface ChatMessageDeliveredEvent {
  type: ChatMessageEventType.Delivered;
  data: {
    deliveredTo: string;
    deliveredAt: Date;
  };
}

export interface ChatMessageReadEvent {
  type: ChatMessageEventType.Read;
  data: {
    readBy: string;
    readAt: Date;
  };
}

export interface ChatMessageEditedEvent {
  type: ChatMessageEventType.Edited;
  data: {
    previousContent: string;
    newContent: string;
    editedBy: string;
    editedAt: Date;
  };
}

export interface ChatMessageDeletedEvent {
  type: ChatMessageEventType.Deleted;
  data: {
    deletedBy: string;
    deletedAt: Date;
  };
}

export interface ChatMessageTranslationAddedEvent {
  type: ChatMessageEventType.TranslationAdded;
  data: {
    language: string;
    translatedContent: string;
    translatedAt: Date;
  };
}

// Union types
export type ChatRoomEvent =
  | ChatRoomCreatedEvent
  | ChatRoomParticipantAddedEvent
  | ChatRoomParticipantRemovedEvent
  | ChatRoomMessageAddedEvent
  | ChatRoomUnreadCountUpdatedEvent
  | ChatRoomTranslationSettingsUpdatedEvent
  | ChatRoomArchivedEvent
  | ChatRoomClosedEvent
  | ChatRoomDeletedEvent;

export type ChatMessageEvent =
  | ChatMessageSentEvent
  | ChatMessageDeliveredEvent
  | ChatMessageReadEvent
  | ChatMessageEditedEvent
  | ChatMessageDeletedEvent
  | ChatMessageTranslationAddedEvent;
