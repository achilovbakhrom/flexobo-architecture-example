export enum ChatEvents {
  JoinRoom = 'join_room',
  SendMessage = 'send_message',
  ReceiveMessage = 'receive_message',
  Typing = 'typing',
  UserTyping = 'user_typing',
  LoadHistory = 'load_history',
  ChatHistory = 'chat_history',
  OnlineUsers = 'online_users',
  JoinedRoom = 'joined_room',
  MarkMessageAsRead = 'mark_message_as_read',
  MarkRoomAsRead = 'mark_room_as_read',
  MessageRead = 'message_read',
  RoomRead = 'room_read',
  UnreadCountUpdated = 'unread_count_updated',
  UnreadChatsCount = 'unread_chats_count',
  MessageEdited = 'message_edited',
  MessageDeleted = 'message_deleted',
  RoomDeleted = 'room_deleted',
  Error = 'error',
  Notification = 'notification',
  // Bid-related events (from Main Service)
  BidCreated = 'bid_created',
  BidUpdated = 'bid_updated',
  BidCancelled = 'bid_cancelled',
}

export enum MessageStatus {
  Sent = 'sent',
  Delivered = 'delivered',
  Read = 'read',
}

export enum SenderType {
  User = 'user',
  Admin = 'admin',
  Superadmin = 'superadmin',
}

export enum MessageType {
  Text = 'text',
  Image = 'image',
  File = 'file',
  Video = 'video',
  Audio = 'audio',
  Voice = 'voice',
  Gif = 'gif',
  Status = 'status',
}

export enum ChatRoomStatus {
  Active = 'active',
  Archived = 'archived',
  Closed = 'closed',
}
