export enum ChatEvents {
  JOIN_ROOM = 'join_room',
  SEND_MESSAGE = 'send_message',
  RECEIVE_MESSAGE = 'receive_message',
  TYPING = 'typing',
  USER_TYPING = 'user_typing',
  LOAD_HISTORY = 'load_history',
  CHAT_HISTORY = 'chat_history',
  ONLINE_USERS = 'online_users',
  JOINED_ROOM = 'joined_room',
  MARK_MESSAGE_AS_READ = 'mark_message_as_read',
  MARK_ROOM_AS_READ = 'mark_room_as_read',
  MESSAGE_READ = 'message_read',
  ROOM_READ = 'room_read',
  UNREAD_COUNT_UPDATED = 'unread_count_updated',
  UNREAD_CHATS_COUNT = 'unread_chats_count',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_DELETED = 'message_deleted',
  ROOM_DELETED = 'room_deleted',
  ERROR = 'error',
  NOTIFICATION = 'notification',
  // Bid-related events (from Main Service)
  BID_CREATED = 'bid_created',
  BID_UPDATED = 'bid_updated',
  BID_CANCELLED = 'bid_cancelled',
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

export enum ChatRoomStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED',
}
