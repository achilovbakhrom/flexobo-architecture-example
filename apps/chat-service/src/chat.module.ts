import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  CqrsModule,
  MessagingModule,
  EventStoreModule,
  OutboxModule,
  MESSAGE_PUBLISHER,
  EventBufferModule,
} from '@flexobo/core';
import { PrismaModule } from './prisma.module';
import configuration from './config/configuration';

// Controllers
import { ChatController } from './adapters/http/v1/chat.controller';

// Gateways
import { ChatGateway } from './adapters/websocket/chat.gateway';

// Ports
import {
  CHAT_ROOM_REPOSITORY,
  CHAT_ROOM_AGGREGATE_STORE,
  CHAT_MESSAGE_REPOSITORY,
  CHAT_MESSAGE_AGGREGATE_STORE,
  REALTIME_SERVICE,
} from './ports';

// Adapters - Persistence
import {
  PrismaChatRoomRepository,
  PrismaChatMessageRepository,
  ChatRoomAggregateStore,
  ChatMessageAggregateStore,
} from './adapters/persistence';

// Adapters - Guards
import { HttpJwtAuthGuard, WsJwtGuard } from './adapters/http/guards';

// Adapters - Eventbus
import {
  ChatRoomProjection,
  ChatMessageProjection,
  ExternalEventsProjection,
} from './adapters/eventbus/projection';

// Adapters - gRPC
import { UsersGrpcClient, ChatGrpcController } from './adapters/grpc';

// Command Handlers
import {
  CreateChatRoomHandler,
  AddParticipantHandler,
  RemoveParticipantHandler,
  ArchiveRoomHandler,
  DeleteRoomHandler,
  UpdateTranslationSettingsHandler,
  MarkRoomAsReadHandler,
  SendMessageHandler,
  EditMessageHandler,
  DeleteMessageHandler,
  MarkMessageAsReadHandler,
  AddTranslationHandler,
} from './application/commands';

// Query Handlers
import {
  GetRoomByIdHandler,
  GetRoomByParticipantsHandler,
  GetRoomByIdentifierHandler,
  GetUserRoomsHandler,
  CountUserRoomsHandler,
  GetUserUnreadStatsHandler,
  GetMessageByIdHandler,
  GetRoomMessagesHandler,
  CountRoomMessagesHandler,
  CountUnreadMessagesHandler,
} from './application/queries';

const CommandHandlers = [
  CreateChatRoomHandler,
  AddParticipantHandler,
  RemoveParticipantHandler,
  ArchiveRoomHandler,
  DeleteRoomHandler,
  UpdateTranslationSettingsHandler,
  MarkRoomAsReadHandler,
  SendMessageHandler,
  EditMessageHandler,
  DeleteMessageHandler,
  MarkMessageAsReadHandler,
  AddTranslationHandler,
];

const QueryHandlers = [
  GetRoomByIdHandler,
  GetRoomByParticipantsHandler,
  GetRoomByIdentifierHandler,
  GetUserRoomsHandler,
  CountUserRoomsHandler,
  GetUserUnreadStatsHandler,
  GetMessageByIdHandler,
  GetRoomMessagesHandler,
  CountRoomMessagesHandler,
  CountUnreadMessagesHandler,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    MessagingModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        config: {
          url: configService.get('rabbitmq.url', 'amqp://localhost:5672'),
          exchange: configService.get('rabbitmq.exchange', 'flexobo.events'),
        },
      }),
      inject: [ConfigService],
    }),
    CqrsModule.forRoot({
      commandHandlers: CommandHandlers,
      queryHandlers: QueryHandlers,
    }),
    EventStoreModule.forRoot({ enableUpcasting: false }),
    OutboxModule.forRoot({
      workerConfig: { pollingIntervalMs: 500, batchSize: 500, enabled: true },
      messagePublisher: { provide: 'IMessagePublisher', useExisting: MESSAGE_PUBLISHER },
    }),
    EventBufferModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: configService.get('redis.url', 'redis://localhost:6379'),
        config: {
          prefix: 'chat:evtbuf',
          eventTtl: 600,
          lockTtlMs: 5000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ChatController, ChatGrpcController],
  providers: [
    // Port implementations - Repositories
    {
      provide: CHAT_ROOM_REPOSITORY,
      useClass: PrismaChatRoomRepository,
    },
    {
      provide: CHAT_MESSAGE_REPOSITORY,
      useClass: PrismaChatMessageRepository,
    },

    // Port implementations - Aggregate Stores
    {
      provide: CHAT_ROOM_AGGREGATE_STORE,
      useClass: ChatRoomAggregateStore,
    },
    {
      provide: CHAT_MESSAGE_AGGREGATE_STORE,
      useClass: ChatMessageAggregateStore,
    },

    // File upload has been moved to File Service
    // Files are now uploaded to File Service which emits chat.file.uploaded event
    // ExternalEventsProjection handles this event and creates file messages

    // Gateway (also implements IRealtimeService)
    ChatGateway,
    {
      provide: REALTIME_SERVICE,
      useExisting: ChatGateway,
    },

    // Projections
    ChatRoomProjection,
    ChatMessageProjection,
    ExternalEventsProjection,

    // gRPC Clients & Controllers
    UsersGrpcClient,
    ChatGrpcController,

    // Guards
    WsJwtGuard,
    HttpJwtAuthGuard,

    // Handlers need to be provided for DI
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class ChatModule {}
