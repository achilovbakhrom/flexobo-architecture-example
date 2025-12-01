import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../../application/services/chat.service';
import {
  SendMessageDto,
  JoinRoomDto,
  MarkAsReadDto,
  MarkRoomAsReadDto,
} from '../../application/dto/chat.dto';
import { ChatEvents, SenderType } from '../../domain/enums/chat.enums';
import {
  WsJwtGuard,
  AuthenticatedSocket,
  getUserFromSocket,
} from '../../infrastructure/guards/ws-jwt.guard';
import { UsersGrpcClient } from '../../infrastructure/clients/users-grpc.client';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  public server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers: Map<string, string> = new Map(); // socket.id -> user_id

  constructor(
    private readonly chatService: ChatService,
    private readonly usersGrpcClient: UsersGrpcClient
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract and validate token
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }

      const result = await this.usersGrpcClient.validateToken(token);
      if (!result.valid) {
        this.logger.warn(`Invalid token: ${result.error}`);
        client.disconnect();
        return;
      }

      // Attach user to socket
      (client as AuthenticatedSocket).user = {
        userId: result.userId,
        role: result.role,
        jti: result.jti,
      };

      this.onlineUsers.set(client.id, result.userId);
      this.logger.log(`User connected: ${result.userId}`);

      // Emit online users
      const uniqueUsers = Array.from(new Set(this.onlineUsers.values()));
      this.server.emit(ChatEvents.ONLINE_USERS, uniqueUsers);

      // Emit unread chats count to the connected user
      await this.emitUserUnreadChatsCount(result.userId, client);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('WebSocket connection failed:', message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.onlineUsers.get(client.id);
    this.onlineUsers.delete(client.id);

    // Emit updated online users
    this.server.emit(
      ChatEvents.ONLINE_USERS,
      Array.from(new Set(this.onlineUsers.values()))
    );

    this.logger.log(`User disconnected: ${userId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.JOIN_ROOM)
  async handleJoinRoom(
    @MessageBody() body: JoinRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const room = await this.chatService.getRoomById(body.roomId);
    if (!room) {
      client.emit(ChatEvents.ERROR, { message: 'Room not found' });
      return;
    }

    const { userId } = getUserFromSocket(client);

    // Verify user is a participant
    if (!room.participants.includes(userId)) {
      client.emit(ChatEvents.ERROR, { message: 'Not a participant of this room' });
      return;
    }

    client.join(body.roomId);
    client.emit(ChatEvents.JOINED_ROOM, { roomId: body.roomId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.SEND_MESSAGE)
  async handleSendMessage(
    @MessageBody() body: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const { userId, role } = getUserFromSocket(client);

    const senderType = this.mapRoleToSenderType(role);

    const { message, room } = await this.chatService.sendMessage({
      ...body,
      senderId: userId,
      senderType,
    });

    // Join the room if not already
    client.join(body.roomId);

    // Emit message to room
    this.server.to(body.roomId).emit(ChatEvents.RECEIVE_MESSAGE, message);

    // Emit unread count updates
    this.emitUnreadCountUpdate(room);
    await this.emitUserUnreadChatsCount(userId, client);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.TYPING)
  handleTyping(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const { userId } = getUserFromSocket(client);
    client.to(data.roomId).emit(ChatEvents.USER_TYPING, {
      roomId: data.roomId,
      userId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.LOAD_HISTORY)
  async handleLoadHistory(
    @MessageBody() data: { roomId: string; page: number },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const messages = await this.chatService.getMessages(data.roomId, data.page);
    client.emit(ChatEvents.CHAT_HISTORY, messages.reverse());
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.MARK_MESSAGE_AS_READ)
  async handleMarkAsRead(
    @MessageBody() data: MarkAsReadDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const { userId } = getUserFromSocket(client);

    const { message, room } = await this.chatService.markMessageAsRead(
      data.messageId,
      userId
    );

    this.server.to(room.id).emit(ChatEvents.MESSAGE_READ, {
      messageId: data.messageId,
      readerId: userId,
      readAt: message.readAt,
    });

    this.emitUnreadCountUpdate(room);
    await this.emitUserUnreadChatsCount(userId, client);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.UNREAD_CHATS_COUNT)
  async handleUnreadChatsCount(@ConnectedSocket() client: AuthenticatedSocket) {
    const { userId } = getUserFromSocket(client);
    const unreadData = await this.chatService.getUserUnreadChatsCount(userId);
    client.emit(ChatEvents.UNREAD_CHATS_COUNT, unreadData);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.MARK_ROOM_AS_READ)
  async handleMarkRoomAsRead(
    @MessageBody() data: MarkRoomAsReadDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const { userId } = getUserFromSocket(client);

    const room = await this.chatService.markRoomAsRead(data.roomId, userId);

    this.server.to(room.id).emit(ChatEvents.ROOM_READ, {
      unreadCounts: room.unreadCounts,
      readerId: userId,
      readAt: Date.now(),
    });

    this.emitUnreadCountUpdate(room);
    await this.emitUserUnreadChatsCount(userId, client);
  }

  // Helper to emit to specific user across all their connections
  async emitToUser(userId: string, event: string, data: any) {
    const socketIds: string[] = [];
    this.onlineUsers.forEach((uid, socketId) => {
      if (uid === userId) {
        socketIds.push(socketId);
      }
    });

    socketIds.forEach((socketId) => {
      this.server.to(socketId).emit(event, data);
    });
  }

  private emitUnreadCountUpdate(room: any) {
    this.server.to(room.id).emit(ChatEvents.UNREAD_COUNT_UPDATED, {
      roomId: room.id,
      unreadCounts: room.unreadCounts,
      updatedAt: Date.now(),
    });
  }

  private async emitUserUnreadChatsCount(userId: string, client: Socket) {
    const unreadData = await this.chatService.getUserUnreadChatsCount(userId);
    client.emit(ChatEvents.UNREAD_CHATS_COUNT, unreadData);
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    const authToken = client.handshake?.auth?.token;
    if (authToken) return authToken;

    const queryToken = client.handshake?.query?.token;
    if (queryToken) {
      return Array.isArray(queryToken) ? queryToken[0] : queryToken;
    }

    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      return type === 'Bearer' ? token : undefined;
    }

    return undefined;
  }

  private mapRoleToSenderType(role: string): SenderType {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return SenderType.ADMIN;
      case 'SUPERADMIN':
        return SenderType.SUPERADMIN;
      default:
        return SenderType.USER;
    }
  }
}
