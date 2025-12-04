import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  CqrsModule,
  MessagingModule,
  EventStoreModule,
  OutboxModule,
  MESSAGE_PUBLISHER,
} from '@flexobo/core';
import { PrismaModule } from './prisma.module';

// Controllers
import { TransportController } from './adapters/http/v1/transport.controller';
import { LoadController } from './adapters/http/v1/load.controller';
import { TripController } from './adapters/http/v1/trip.controller';
import { BidController } from './adapters/http/v1/bid.controller';
import { BookingController } from './adapters/http/v1/booking.controller';
import { BoardController } from './adapters/http/v1/board.controller';
import { LanguageController } from './adapters/http/v1/language.controller';

// Guards
import { JwtAuthGuard } from './adapters/http/guards/jwt-auth.guard';

// gRPC Clients
import { UsersGrpcClient } from './adapters/grpc/users-grpc.client';
import { ChatGrpcClient } from './adapters/grpc/chat-grpc.client';

// Port symbols
import {
  TRANSPORT_AGGREGATE_STORE,
  TRANSPORT_READ_REPOSITORY,
} from './ports/transport.repository';
import {
  LOAD_AGGREGATE_STORE,
  LOAD_READ_REPOSITORY,
} from './ports/load.repository';
import {
  TRIP_AGGREGATE_STORE,
  TRIP_READ_REPOSITORY,
} from './ports/trip.repository';
import {
  BID_AGGREGATE_STORE,
  BID_READ_REPOSITORY,
} from './ports/bid.repository';
import {
  BOOKING_AGGREGATE_STORE,
  BOOKING_READ_REPOSITORY,
} from './ports/booking.repository';
import {
  BOARD_AGGREGATE_STORE,
  BOARD_READ_REPOSITORY,
} from './ports/board.repository';
import { LANGUAGE_REPOSITORY } from './ports/language.repository';
import { CHAT_SERVICE_CLIENT } from './ports/chat-service.client';

// Aggregate Stores
import {
  TransportAggregateStore,
  LoadAggregateStore,
  TripAggregateStore,
  BidAggregateStore,
  BookingAggregateStore,
  BoardAggregateStore,
} from './adapters/persistence';

// Read Repositories
import {
  PrismaTransportReadRepository,
  PrismaLoadReadRepository,
  PrismaTripReadRepository,
  PrismaBidReadRepository,
  PrismaBookingReadRepository,
  PrismaBoardReadRepository,
} from './adapters/persistence/read-model';
import { PrismaLanguageRepository } from './adapters/persistence/read-model/language.repository';

// Projections
import {
  TransportProjection,
  LoadProjection,
  TripProjection,
  BidProjection,
  BookingProjection,
  BoardProjection,
} from './adapters/eventbus/projection';

// Transport Command Handlers
import {
  CreateTransportHandler,
  UpdateTransportHandler,
  DeleteTransportHandler,
} from './application/commands/transport';

// Load Command Handlers
import {
  CreateLoadHandler,
  UpdateLoadHandler,
  ActivateLoadHandler,
  DeleteLoadHandler,
} from './application/commands/load';

// Trip Command Handlers
import {
  CreateTripHandler,
  UpdateTripHandler,
  ActivateTripHandler,
  DeleteTripHandler,
} from './application/commands/trip';

// Bid Command Handlers
import {
  CreateBidHandler,
  CounterBidHandler,
  AcceptBidHandler,
  RejectBidHandler,
  CancelBidHandler,
} from './application/commands/bid';

// Booking Command Handlers
import {
  ConfirmBookingHandler,
  StartProgressHandler,
  CompleteBookingHandler,
  CancelBookingHandler,
  RateBookingHandler,
} from './application/commands/booking';

// Board Command Handlers
import {
  CreateBoardHandler,
  UpdateBoardHandler,
  AddBoardMemberHandler,
  RemoveBoardMemberHandler,
  DeleteBoardHandler,
} from './application/commands/board';
import {
  CreateLanguageHandler,
  UpdateLanguageHandler,
  DeleteLanguageHandler,
} from './application/commands/language';

// Transport Query Handlers
import {
  GetTransportHandler,
  ListTransportsHandler,
} from './application/queries/transport';

// Load Query Handlers
import {
  GetLoadHandler,
  ListLoadsHandler,
  SearchLoadsHandler,
} from './application/queries/load';

// Trip Query Handlers
import {
  GetTripHandler,
  ListTripsHandler,
  SearchTripsHandler,
} from './application/queries/trip';

// Bid Query Handlers
import {
  GetBidHandler,
  ListBidsByPostHandler,
  ListMyBidsHandler,
  ListReceivedBidsHandler,
} from './application/queries/bid';

// Booking Query Handlers
import {
  GetBookingHandler,
  ListBookingsHandler,
} from './application/queries/booking';

// Board Query Handlers
import {
  GetBoardHandler,
  ListBoardsHandler,
} from './application/queries/board';
import {
  GetLanguageHandler,
  ListLanguagesHandler,
} from './application/queries/language';

const CommandHandlers = [
  // Transport
  CreateTransportHandler,
  UpdateTransportHandler,
  DeleteTransportHandler,
  // Load
  CreateLoadHandler,
  UpdateLoadHandler,
  ActivateLoadHandler,
  DeleteLoadHandler,
  // Trip
  CreateTripHandler,
  UpdateTripHandler,
  ActivateTripHandler,
  DeleteTripHandler,
  // Bid
  CreateBidHandler,
  CounterBidHandler,
  AcceptBidHandler,
  RejectBidHandler,
  CancelBidHandler,
  // Booking
  ConfirmBookingHandler,
  StartProgressHandler,
  CompleteBookingHandler,
  CancelBookingHandler,
  RateBookingHandler,
  // Board
  CreateBoardHandler,
  UpdateBoardHandler,
  AddBoardMemberHandler,
  RemoveBoardMemberHandler,
  DeleteBoardHandler,
  // Language
  CreateLanguageHandler,
  UpdateLanguageHandler,
  DeleteLanguageHandler,
];

const QueryHandlers = [
  // Transport
  GetTransportHandler,
  ListTransportsHandler,
  // Load
  GetLoadHandler,
  ListLoadsHandler,
  SearchLoadsHandler,
  // Trip
  GetTripHandler,
  ListTripsHandler,
  SearchTripsHandler,
  // Bid
  GetBidHandler,
  ListBidsByPostHandler,
  ListMyBidsHandler,
  ListReceivedBidsHandler,
  // Booking
  GetBookingHandler,
  ListBookingsHandler,
  // Board
  GetBoardHandler,
  ListBoardsHandler,
  // Language
  GetLanguageHandler,
  ListLanguagesHandler,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    MessagingModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        config: {
          url: configService.get('RABBITMQ_URL', 'amqp://localhost:5672'),
          exchange: configService.get('RABBITMQ_EXCHANGE', 'flexobo.events'),
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
      workerConfig: { pollingIntervalMs: 5000, batchSize: 100, enabled: true },
      messagePublisher: {
        provide: 'IMessagePublisher',
        useExisting: MESSAGE_PUBLISHER,
      },
    }),
  ],
  controllers: [
    TransportController,
    LoadController,
    TripController,
    BidController,
    BookingController,
    BoardController,
    LanguageController
  ],
  providers: [
    // Guards
    JwtAuthGuard,

    // gRPC Clients
    UsersGrpcClient,
    ChatGrpcClient,
    {
      provide: CHAT_SERVICE_CLIENT,
      useExisting: ChatGrpcClient,
    },

    // Aggregate Stores
    {
      provide: TRANSPORT_AGGREGATE_STORE,
      useClass: TransportAggregateStore,
    },
    {
      provide: LOAD_AGGREGATE_STORE,
      useClass: LoadAggregateStore,
    },
    {
      provide: TRIP_AGGREGATE_STORE,
      useClass: TripAggregateStore,
    },
    {
      provide: BID_AGGREGATE_STORE,
      useClass: BidAggregateStore,
    },
    {
      provide: BOOKING_AGGREGATE_STORE,
      useClass: BookingAggregateStore,
    },
    {
      provide: BOARD_AGGREGATE_STORE,
      useClass: BoardAggregateStore,
    },

    // Read Repositories
    {
      provide: TRANSPORT_READ_REPOSITORY,
      useClass: PrismaTransportReadRepository,
    },
    {
      provide: LOAD_READ_REPOSITORY,
      useClass: PrismaLoadReadRepository,
    },
    {
      provide: TRIP_READ_REPOSITORY,
      useClass: PrismaTripReadRepository,
    },
    {
      provide: BID_READ_REPOSITORY,
      useClass: PrismaBidReadRepository,
    },
    {
      provide: BOOKING_READ_REPOSITORY,
      useClass: PrismaBookingReadRepository,
    },
    {
      provide: BOARD_READ_REPOSITORY,
      useClass: PrismaBoardReadRepository,
    },
    {
      provide: LANGUAGE_REPOSITORY,
      useClass: PrismaLanguageRepository,
    },

    // Projections
    TransportProjection,
    LoadProjection,
    TripProjection,
    BidProjection,
    BookingProjection,
    BoardProjection,

    // Handlers
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class MainModule {}
