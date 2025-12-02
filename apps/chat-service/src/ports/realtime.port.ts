// ============================================================
// Realtime Notification Service Port
// ============================================================

export interface IRealtimeService {
  // Room-based notifications
  notifyRoom(roomId: string, event: string, data: unknown): void;
  notifyRoomExcept(roomId: string, excludeSocketId: string, event: string, data: unknown): void;

  // User-based notifications
  notifyUser(userId: string, event: string, data: unknown): void;
  notifyUsers(userIds: string[], event: string, data: unknown): void;

  // Connection management
  joinRoom(socketId: string, roomId: string): void;
  leaveRoom(socketId: string, roomId: string): void;

  // Online status
  isUserOnline(userId: string): boolean;
  getOnlineUsers(): string[];
}

export const REALTIME_SERVICE = Symbol('IRealtimeService');

// ============================================================
// WebSocket Event Types
// ============================================================

export const WS_EVENTS = {
  // Outgoing events (server → client)
  NEW_MESSAGE: 'new_message',
  MESSAGE_UPDATED: 'message_updated',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_READ: 'message_read',
  ROOM_UPDATED: 'room_updated',
  TYPING: 'typing',
  UNREAD_COUNT: 'unread_count',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  ERROR: 'error',

  // Incoming events (client → server)
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SEND_MESSAGE: 'send_message',
  EDIT_MESSAGE: 'edit_message',
  DELETE_MESSAGE: 'delete_message',
  MARK_AS_READ: 'mark_as_read',
  MARK_ROOM_AS_READ: 'mark_room_as_read',
  START_TYPING: 'start_typing',
  STOP_TYPING: 'stop_typing',
  LOAD_HISTORY: 'load_history',
} as const;
