import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import {
  IChatServiceClient,
  CreateChatRoomResponse,
} from '../../ports/chat-service.client';

interface ChatGrpcService {
  CreateChatRoom: (
    request: {
      participant_ids: string[];
      created_by: string;
      is_group: boolean;
      group_name?: string;
      is_support_chat: boolean;
      identifier_id: string;
      identifier_type: string;
    },
    callback: (error: Error | null, response: any) => void
  ) => void;
  GetChatRoom: (
    request: { room_id: string },
    callback: (error: Error | null, response: any) => void
  ) => void;
  GetChatRoomByIdentifier: (
    request: { identifier_id: string; identifier_type: string },
    callback: (error: Error | null, response: any) => void
  ) => void;
  SendSystemMessage: (
    request: {
      room_id: string;
      content: string;
      message_type: string;
      metadata?: Record<string, string>;
    },
    callback: (error: Error | null, response: any) => void
  ) => void;
  UpdateRoomStatus: (
    request: { room_id: string; status: string; updated_by: string },
    callback: (error: Error | null, response: any) => void
  ) => void;
}

@Injectable()
export class ChatGrpcClient implements IChatServiceClient, OnModuleInit {
  private client: ChatGrpcService | null = null;
  private readonly logger = new Logger(ChatGrpcClient.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const chatServiceUrl = this.configService.get<string>(
      'CHAT_SERVICE_GRPC_URL',
      'localhost:50052'
    );

    const PROTO_PATH = join(
      process.cwd(),
      'libs/shared-kernel/src/lib/grpc/proto/chat.proto'
    );

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    const ChatService = protoDescriptor.chat.ChatService;

    this.client = new ChatService(
      chatServiceUrl,
      grpc.credentials.createInsecure()
    );

    this.logger.log(`Chat gRPC client connected to ${chatServiceUrl}`);
  }

  async createChatRoom(
    participantIds: string[],
    identifierId: string,
    identifierType: string
  ): Promise<CreateChatRoomResponse> {
    if (!this.client) {
      throw new Error('Chat gRPC client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client!.CreateChatRoom(
        {
          participant_ids: participantIds,
          created_by: participantIds[0], // First participant is the creator
          is_group: participantIds.length > 2,
          is_support_chat: false,
          identifier_id: identifierId,
          identifier_type: identifierType,
        },
        (error: Error | null, response: any) => {
          if (error) {
            this.logger.error(`CreateChatRoom failed: ${error.message}`);
            reject(error);
            return;
          }

          if (!response.success) {
            reject(new Error(response.error || 'Failed to create chat room'));
            return;
          }

          resolve({ roomId: response.roomId });
        }
      );
    });
  }

  async getChatRoom(roomId: string): Promise<{ found: boolean; room?: any }> {
    if (!this.client) {
      throw new Error('Chat gRPC client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client!.GetChatRoom(
        { room_id: roomId },
        (error: Error | null, response: any) => {
          if (error) {
            this.logger.error(`GetChatRoom failed: ${error.message}`);
            reject(error);
            return;
          }

          resolve({
            found: response.found,
            room: response.room,
          });
        }
      );
    });
  }

  async getChatRoomByIdentifier(
    identifierId: string,
    identifierType: string
  ): Promise<{ found: boolean; room?: any }> {
    if (!this.client) {
      throw new Error('Chat gRPC client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client!.GetChatRoomByIdentifier(
        { identifier_id: identifierId, identifier_type: identifierType },
        (error: Error | null, response: any) => {
          if (error) {
            this.logger.error(`GetChatRoomByIdentifier failed: ${error.message}`);
            reject(error);
            return;
          }

          resolve({
            found: response.found,
            room: response.room,
          });
        }
      );
    });
  }

  async sendSystemMessage(
    roomId: string,
    content: string,
    messageType: string,
    metadata?: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string }> {
    if (!this.client) {
      throw new Error('Chat gRPC client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client!.SendSystemMessage(
        {
          room_id: roomId,
          content,
          message_type: messageType,
          metadata,
        },
        (error: Error | null, response: any) => {
          if (error) {
            this.logger.error(`SendSystemMessage failed: ${error.message}`);
            reject(error);
            return;
          }

          resolve({
            success: response.success,
            messageId: response.messageId,
          });
        }
      );
    });
  }

  async updateRoomStatus(
    roomId: string,
    status: string,
    updatedBy: string
  ): Promise<{ success: boolean }> {
    if (!this.client) {
      throw new Error('Chat gRPC client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.client!.UpdateRoomStatus(
        { room_id: roomId, status, updated_by: updatedBy },
        (error: Error | null, response: any) => {
          if (error) {
            this.logger.error(`UpdateRoomStatus failed: ${error.message}`);
            reject(error);
            return;
          }

          resolve({ success: response.success });
        }
      );
    });
  }
}
