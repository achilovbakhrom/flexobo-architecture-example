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
import { CommandBus, QueryBus } from '@flexobo/core';
import {
  SendMessageDto,
  JoinRoomDto,
  MarkAsReadDto,
  MarkRoomAsReadDto,
} from '../http/dto';
import {
  WsJwtGuard,
  AuthenticatedSocket,
  getUserFromSocket,
} from '../http/guards';
import { UsersGrpcClient } from '../grpc';
import {
  ChatEvents,
  SenderType,
  IRealtimeService,
  ChatRoomReadModelDto,
  ChatMessageReadModelDto,
} from '../../ports';

// Commands
import {
  SendMessageCommand,
  MarkMessageAsReadCommand,
  MarkRoomAsReadCommand,
} from '../../application/commands';
import { SendMessageResult } from '../../application/commands/message.handlers';

// Queries
import {
  GetRoomByIdQuery,
  GetRoomMessagesQuery,
  GetUserUnreadStatsQuery,
  PaginatedResult,
  UnreadStatsResult,
} from '../../application/queries';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, IRealtimeService
{
  @WebSocketServer()
  public server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers: Map<string, string> = new Map(); // socket.id -> user_id
  private userSockets: Map<string, Set<string>> = new Map(); // user_id -> Set<socket.id>

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly usersGrpcClient: UsersGrpcClient
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
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

      // Track online users
      this.onlineUsers.set(client.id, result.userId);

      // Track user's sockets
      const existingSockets = this.userSockets.get(result.userId);
      if (existingSockets) {
        existingSockets.add(client.id);
      } else {
        this.userSockets.set(result.userId, new Set([client.id]));
      }

      this.logger.log(`User connected: ${result.userId}`);

      // Emit online users
      this.server.emit(ChatEvents.OnlineUsers, this.getOnlineUsers());

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

    // Remove socket from user's socket set
    if (userId) {
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    // Emit updated online users
    this.server.emit(ChatEvents.OnlineUsers, this.getOnlineUsers());

    this.logger.log(`User disconnected: ${userId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.JoinRoom)
  async handleJoinRoom(
    @MessageBody() body: JoinRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const query = new GetRoomByIdQuery(body.roomId);
    const room = await this.queryBus.execute<ChatRoomReadModelDto | null>(query);

    if (!room) {
      client.emit(ChatEvents.Error, { message: 'Room not found' });
      return;
    }

    const { userId } = getUserFromSocket(client);

    // Verify user is a participant
    if (!room.participants.includes(userId)) {
      client.emit(ChatEvents.Error, { message: 'Not a participant of this room' });
      return;
    }

    client.join(body.roomId);
    client.emit(ChatEvents.JoinedRoom, { roomId: body.roomId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.SendMessage)
  async handleSendMessage(
    @MessageBody() body: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const { userId, role } = getUserFromSocket(client);
    const senderType = this.mapRoleToSenderType(role);

    const command = new SendMessageCommand(
      body.roomId,
      userId,
      senderType,
      body.content,
      body.type,
      body.fileUrls,
      body.fileName,
      undefined, // fileMetadata
      body.voiceDuration,
      body.replyToId
    );

    const result = await this.commandBus.execute<SendMessageResult>(command);

    if (result.isFailure) {
      client.emit(ChatEvents.Error, { message: result.error?.message || 'Failed to send message' });
      return;
    }

    // Join the room if not already
    client.join(body.roomId);

    // Emit message to room
    this.server.to(body.roomId).emit(ChatEvents.ReceiveMessage, result.value.message);

    // Emit unread count updates
    this.emitUnreadCountUpdate(body.roomId, result.value.unreadCounts);
    await this.emitUserUnreadChatsCount(userId, client);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.Typing)
  handleTyping(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const { userId } = getUserFromSocket(client);
    client.to(data.roomId).emit(ChatEvents.UserTyping, {
      roomId: data.roomId,
      userId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.LoadHistory)
  async handleLoadHistory(
    @MessageBody() data: { roomId: string; page: number },
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const query = new GetRoomMessagesQuery(data.roomId, data.page, 20);
    const result = await this.queryBus.execute<PaginatedResult<ChatMessageReadModelDto>>(query);

    client.emit(ChatEvents.ChatHistory, result.data.reverse());
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.MarkMessageAsRead)
  async handleMarkAsRead(
    @MessageBody() data: MarkAsReadDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const { userId } = getUserFromSocket(client);

    const command = new MarkMessageAsReadCommand(data.messageId, userId);
    const result = await this.commandBus.execute<ChatMessageReadModelDto>(command);

    if (result.isFailure) {
      client.emit(ChatEvents.Error, { message: result.error?.message || 'Failed to mark message as read' });
      return;
    }

    const message = result.value;

    this.server.to(message.roomId).emit(ChatEvents.MessageRead, {
      messageId: data.messageId,
      readerId: userId,
      readAt: message.readAt,
    });

    // Get updated unread counts
    const roomQuery = new GetRoomByIdQuery(message.roomId);
    const room = await this.queryBus.execute<ChatRoomReadModelDto | null>(roomQuery);

    if (room) {
      this.emitUnreadCountUpdate(room.id, room.unreadCounts);
    }

    await this.emitUserUnreadChatsCount(userId, client);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.UnreadChatsCount)
  async handleUnreadChatsCount(@ConnectedSocket() client: AuthenticatedSocket) {
    const { userId } = getUserFromSocket(client);
    await this.emitUserUnreadChatsCount(userId, client);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage(ChatEvents.MarkRoomAsRead)
  async handleMarkRoomAsRead(
    @MessageBody() data: MarkRoomAsReadDto,
    @ConnectedSocket() client: AuthenticatedSocket
  ) {
    const { userId } = getUserFromSocket(client);

    const command = new MarkRoomAsReadCommand(data.roomId, userId);
    const result = await this.commandBus.execute<ChatRoomReadModelDto>(command);

    if (result.isFailure) {
      client.emit(ChatEvents.Error, { message: result.error?.message || 'Failed to mark room as read' });
      return;
    }

    const room = result.value;

    this.server.to(room.id).emit(ChatEvents.RoomRead, {
      unreadCounts: room.unreadCounts,
      readerId: userId,
      readAt: Date.now(),
    });

    this.emitUnreadCountUpdate(room.id, room.unreadCounts);
    await this.emitUserUnreadChatsCount(userId, client);
  }

  notifyRoom(roomId: string, event: string, data: unknown): void {
    this.server.to(roomId).emit(event, data);
  }

  notifyRoomExcept(roomId: string, excludeSocketId: string, event: string, data: unknown): void {
    this.server.to(roomId).except(excludeSocketId).emit(event, data);
  }

  notifyUser(userId: string, event: string, data: unknown): void {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  notifyUsers(userIds: string[], event: string, data: unknown): void {
    userIds.forEach((userId) => this.notifyUser(userId, event, data));
  }

  joinRoom(socketId: string, roomId: string): void {
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(roomId);
    }
  }

  leaveRoom(socketId: string, roomId: string): void {
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(roomId);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  private emitUnreadCountUpdate(roomId: string, unreadCounts: Record<string, number>) {
    this.server.to(roomId).emit(ChatEvents.UnreadCountUpdated, {
      roomId,
      unreadCounts,
      updatedAt: Date.now(),
    });
  }

  private async emitUserUnreadChatsCount(userId: string, client: Socket) {
    const query = new GetUserUnreadStatsQuery(userId);
    const unreadData = await this.queryBus.execute<UnreadStatsResult>(query);
    client.emit(ChatEvents.UnreadChatsCount, unreadData);
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
        return SenderType.Admin;
      case 'SUPERADMIN':
        return SenderType.Superadmin;
      default:
        return SenderType.User;
    }
  }
}
