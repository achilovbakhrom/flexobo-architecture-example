# Chat System Analysis

## Architecture Overview

- **Backend**: NestJS microservice with WebSocket gateway at `/chat` namespace
- **Frontend**: React with Socket.io client + React Query
- **Communication**: REST API + WebSocket (Socket.io)

---

## REST API Endpoints

### Chat Service (`/api/v1/chat`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/chat/rooms` | Get user's chat rooms (paginated) |
| GET | `/chat/rooms/:roomId/messages` | Get messages for a room |
| POST | `/chat/rooms` | Create or find a chat room |
| DELETE | `/chat/rooms/:roomId` | Delete a room |
| PUT | `/chat/rooms/:roomId/translation` | Update translation settings |
| PUT | `/chat/messages/:id` | Edit a message |
| DELETE | `/chat/messages/:id` | Delete a message |
| GET | `/chat/unread` | Get unread stats |

### File Service (`/api/v1/files`) - For Chat File Uploads

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/files/chat/upload` | Upload file for chat (includes chatId) |
| GET | `/files/:fileId` | Get file metadata |
| GET | `/files/:fileId/download` | Get file download URL |

---

## WebSocket Events

### Client → Server (Emit)

| Event | Payload | Purpose |
|-------|---------|---------|
| `join_room` | `{ roomId }` | Join room to receive messages |
| `send_message` | `{ roomId, content, type, fileUrls, replyToId... }` | Send message |
| `typing` | `{ roomId }` | Typing indicator |
| `load_history` | `{ roomId, page }` | Paginate history |
| `mark_message_as_read` | `{ messageId }` | Mark single message read |
| `mark_room_as_read` | `{ roomId }` | Mark all messages read |
| `unread_chats_count` | `{}` | Request unread count |

### Server → Client (Listen)

| Event | Payload | Purpose |
|-------|---------|---------|
| `receive_message` | `IChatMessage` | New message |
| `user_typing` | `{ roomId, userId }` | Someone typing |
| `message_read` | `{ messageId, readerId, readAt }` | Read receipt |
| `room_read` | `{ unreadCounts, readerId }` | Room marked read |
| `message_edited` | `IChatMessage` | Message edited |
| `message_deleted` | `{ messageId }` | Message deleted |
| `room_deleted` | `{ roomId }` | Room deleted |
| `online_users` | `string[]` | Online presence |
| `unread_count_updated` | `{ roomId, unreadCounts }` | Unread changed |
| `unread_chats_count` | `{ total_unread_chats }` | Total unread |
| `chat_history` | `IChatMessage[]` | History loaded |
| `error` | `{ message }` | Error occurred |
| `bid_created` | `{ bidId, chatRoomId, ... }` | Bid created (from Main Service) |
| `bid_updated` | `{ bidId, action, price, ... }` | Bid updated (counter/accept/reject) |
| `bid_cancelled` | `{ bidId, chatRoomId, reason }` | Bid cancelled |

---

## Flows for Each Functionality

### 1. Opening Chat / Loading Rooms

```
Frontend                          Backend
   │                                 │
   ├──GET /chat/rooms───────────────►│
   │◄──────────────rooms list────────┤
   │                                 │
   ├──WS: connect (JWT header)──────►│
   │◄──────────WS: connected─────────┤
   │                                 │
   ├──WS: unread_chats_count────────►│
   │◄───WS: unread_chats_count───────┤
```

### 2. Entering a Chat Room

```
Frontend                          Backend
   │                                 │
   ├──WS: join_room {roomId}────────►│
   │◄────WS: joined_room─────────────┤
   │                                 │
   ├──GET /rooms/:id/messages───────►│
   │◄────────messages list───────────┤
   │                                 │
   ├──WS: mark_room_as_read─────────►│
   │◄──WS: room_read─────────────────┤
   │◄──WS: unread_chats_count────────┤
```

### 3. Sending a Message

```
Frontend                          Backend
   │                                 │
   ├──WS: send_message──────────────►│
   │   {roomId, content, type}       │
   │                                 │
   │◄──WS: receive_message───────────┤ (to all in room)
   │◄──WS: unread_count_updated──────┤ (to others)
```

### 4. Typing Indicator

```
Frontend                          Backend
   │                                 │
   ├──WS: typing {roomId}───────────►│
   │                                 │
   │◄──WS: user_typing───────────────┤ (to others in room)
```

### 5. Message Read Receipt

```
Frontend                          Backend
   │                                 │
   ├──WS: mark_message_as_read──────►│
   │   {messageId}                   │
   │                                 │
   │◄──WS: message_read──────────────┤ (to all in room)
   │◄──WS: unread_count_updated──────┤
   │◄──WS: unread_chats_count────────┤
```

### 6. Edit Message

```
Frontend                          Backend
   │                                 │
   ├──PUT /messages/:id─────────────►│
   │   {content: "new text"}         │
   │◄──────────updated message───────┤
   │                                 │
   │◄──WS: message_edited────────────┤ (to all in room)
```

### 7. Delete Message

```
Frontend                          Backend
   │                                 │
   ├──DELETE /messages/:id──────────►│
   │◄──────────{success: true}───────┤
   │                                 │
   │◄──WS: message_deleted───────────┤ (to all in room)
```

### 8. File Upload & Send (via File Service)

```
Frontend                File Service              Chat Service
   │                         │                         │
   ├─POST /files/chat/upload─►                         │
   │   {chatId, file}        │                         │
   │◄────{fileId, url}───────┤                         │
   │                         │                         │
   │                         ├─Event: chat.file.uploaded─►
   │                         │                         ├─Create FILE message
   │                         │                         ├─Save to DB
   │◄───────────────WS: receive_message────────────────┤
```

> **Note:** File upload has been moved to File Service. When a file is uploaded with a `chatId`,
> File Service emits a `chat.file.uploaded` event via RabbitMQ. Chat Service listens to this event
> and automatically creates a FILE message in the specified chat room.

### 9. Load More History (Infinite Scroll)

```
Frontend                          Backend
   │                                 │
   ├──WS: load_history──────────────►│
   │   {roomId, page: 2}             │
   │                                 │
   │◄──WS: chat_history──────────────┤
   │   (older messages array)        │
```

### 10. Create New Room

```
Frontend                          Backend
   │                                 │
   ├──POST /chat/rooms──────────────►│
   │   {participants: [...],         │
   │    isGroup, isSupportChat}      │
   │◄──────────new room──────────────┤
   │                                 │
   ├──WS: join_room─────────────────►│
```

---

## Message Types Supported

| Type | Description |
|------|-------------|
| `TEXT` | Plain text message |
| `IMAGE` | Image file |
| `FILE` | Generic file |
| `VIDEO` | Video file |
| `AUDIO` | Audio file |
| `VOICE` | Voice recording |
| `GIF` | Animated GIF |
| `STATUS` | System status message |
| `BID` | Bid-related message (business logic) |

---

## Data Structures

### SendMessageDto (Client → Server)

```typescript
{
  roomId: string;          // UUID
  type?: MessageType;      // TEXT, IMAGE, FILE, etc.
  content?: string;        // Message text
  fileUrls?: string[];     // Uploaded file URLs
  fileName?: string;       // Original filename
  voiceDuration?: number;  // Voice message duration
  replyToId?: string;      // Reply to message ID
}
```

### IChatMessage (Server → Client)

```typescript
{
  id: string;
  roomId: string;
  senderId: string;
  senderType: SenderType;  // USER, ADMIN, SUPERADMIN
  type: MessageType;
  content?: string;
  fileUrls?: string[];
  fileName?: string;
  voiceDuration?: number;
  status: MessageStatus;   // SENT, DELIVERED, READ
  isRead: boolean;
  readAt?: Date;
  replyToId?: string;
  translations?: Array<{ language: string; text: string }>;
  editHistory?: Array<{ previousContent: string; editedAt: Date }>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### CreateRoomDto

```typescript
{
  participants: string[];  // User IDs
  isGroup?: boolean;
  groupName?: string;
  isSupportChat?: boolean;
  identifierId?: string;
  identifierType?: string;
}
```

### ChatRoomResponseDto

```typescript
{
  id: string;
  participants: string[];
  isGroup: boolean;
  groupName?: string;
  isSupportChat: boolean;
  status: ChatRoomStatus;  // ACTIVE, ARCHIVED, CLOSED
  unreadCounts?: Record<string, number>;
  lastMessagePreview?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Key Files

### Backend

| File | Description |
|------|-------------|
| `apps/chat-service/src/adapters/http/v1/chat.controller.ts` | REST endpoints |
| `apps/chat-service/src/adapters/websocket/chat.gateway.ts` | WebSocket events |
| `apps/chat-service/src/adapters/http/dto/chat.dto.ts` | DTOs |
| `apps/chat-service/src/ports/chat.enums.ts` | Enums |
| `apps/chat-service/src/domain/aggregates/chat-message.aggregate.ts` | Message aggregate |
| `apps/chat-service/src/domain/aggregates/chat-room.aggregate.ts` | Room aggregate |
| `apps/chat-service/src/application/commands/chat.commands.ts` | Commands |
| `apps/chat-service/src/application/queries/chat.queries.ts` | Queries |

### Frontend

| File | Description |
|------|-------------|
| `src/modules/chat/libs/websocket.ts` | WebSocket service |
| `src/modules/chat/api/chatAPI.ts` | REST API calls |
| `src/modules/chat/context/ChatWebSocketContext.tsx` | WebSocket provider |
| `src/modules/chat/ui/ChatRoom.tsx` | Main chat UI |
| `src/modules/chat/ui/ChatRoomsList.tsx` | Rooms list |
| `src/modules/chat/ui/MessageInput.tsx` | Message input |
| `src/modules/chat/types/Chat.ts` | Type definitions |

---

## Authentication

- **HTTP**: Bearer token in `Authorization` header
- **WebSocket**: JWT token passed via `extraHeaders: { access_token: token }`
- **Token validation**: Performed via gRPC call to users-service

---

## Connection Management

- **Auto-reconnect**: Enabled with 1000ms delay, max 5 attempts
- **Room tracking**: Provider tracks joined rooms and rejoins on reconnection
- **Online presence**: `online_users` event broadcast on connect/disconnect
