import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  CqrsModule,
  MessagingModule,
  EventStoreModule,
  OutboxModule,
  EventBufferModule,
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
import { CompanyController } from './adapters/http/v1/company.controller';
import { ReferenceDataController } from './adapters/http/v1/reference-data.controller';
import { SavedSearchController } from './adapters/http/v1/saved-search.controller';
import { StatisticsController } from './adapters/http/v1/statistics.controller';

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
import {
  COMPANY_AGGREGATE_STORE,
  COMPANY_READ_REPOSITORY,
} from './ports/company.repository';
import { REFERENCE_DATA_REPOSITORY } from './ports/reference-data.repository';
import {
  SAVED_SEARCH_AGGREGATE_STORE,
  SAVED_SEARCH_READ_REPOSITORY,
} from './ports/saved-search.repository';
import { CHAT_SERVICE_CLIENT } from './ports/chat-service.client';

// Aggregate Stores
import {
  TransportAggregateStore,
  LoadAggregateStore,
  TripAggregateStore,
  BidAggregateStore,
  BookingAggregateStore,
  BoardAggregateStore,
  CompanyAggregateStore,
  SavedSearchAggregateStore,
} from './adapters/persistence';

// Read Repositories
import {
  PrismaTransportReadRepository,
  PrismaLoadReadRepository,
  PrismaTripReadRepository,
  PrismaBidReadRepository,
  PrismaBookingReadRepository,
  PrismaBoardReadRepository,
  PrismaCompanyReadRepository,
  PrismaReferenceDataRepository,
  PrismaSavedSearchReadRepository,
} from './adapters/persistence/read-model';

// Projections
import {
  TransportProjection,
  LoadProjection,
  TripProjection,
  BidProjection,
  BookingProjection,
  BoardProjection,
  CompanyProjection,
  SavedSearchProjection,
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

// Company Command Handlers
import {
  CreateCompanyHandler,
  UpdateCompanyHandler,
  DeleteCompanyHandler,
  VerifyCompanyHandler,
  RejectCompanyHandler,
  SuspendCompanyHandler,
  ReactivateCompanyHandler,
  AddCompanyMemberHandler,
  UpdateCompanyMemberHandler,
  RemoveCompanyMemberHandler,
} from './application/commands/company';

// Saved Search Command Handlers
import {
  CreateSavedSearchHandler,
  UpdateSavedSearchHandler,
  DeleteSavedSearchHandler,
} from './application/commands/saved-search';

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

// Company Query Handlers
import {
  GetCompanyHandler,
  GetMyCompanyHandler,
  ListCompaniesHandler,
  GetCompanyMembersHandler,
  GetUserCompaniesHandler,
} from './application/queries/company';

// Saved Search Query Handlers
import {
  GetSavedSearchHandler,
  ListSavedSearchesHandler,
} from './application/queries/saved-search';

// Statistics Query Handlers
import {
  GetDashboardStatsHandler,
  GetMarketStatsHandler,
  GetRouteAnalyticsHandler,
} from './application/queries/statistics';

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
  // Company
  CreateCompanyHandler,
  UpdateCompanyHandler,
  DeleteCompanyHandler,
  VerifyCompanyHandler,
  RejectCompanyHandler,
  SuspendCompanyHandler,
  ReactivateCompanyHandler,
  AddCompanyMemberHandler,
  UpdateCompanyMemberHandler,
  RemoveCompanyMemberHandler,
  // Saved Search
  CreateSavedSearchHandler,
  UpdateSavedSearchHandler,
  DeleteSavedSearchHandler,
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
  // Company
  GetCompanyHandler,
  GetMyCompanyHandler,
  ListCompaniesHandler,
  GetCompanyMembersHandler,
  GetUserCompaniesHandler,
  // Saved Search
  GetSavedSearchHandler,
  ListSavedSearchesHandler,
  // Statistics
  GetDashboardStatsHandler,
  GetMarketStatsHandler,
  GetRouteAnalyticsHandler,
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
      workerConfig: { pollingIntervalMs: 500, batchSize: 500, enabled: true },
      messagePublisher: {
        provide: 'IMessagePublisher',
        useExisting: MESSAGE_PUBLISHER,
      },
    }),
    EventBufferModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: configService.get('REDIS_URL', 'redis://localhost:6379'),
        config: {
          prefix: 'main:evtbuf',
          eventTtl: 600,
          lockTtlMs: 5000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    TransportController,
    LoadController,
    TripController,
    BidController,
    BookingController,
    BoardController,
    CompanyController,
    ReferenceDataController,
    SavedSearchController,
    StatisticsController,
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
    {
      provide: COMPANY_AGGREGATE_STORE,
      useClass: CompanyAggregateStore,
    },
    {
      provide: SAVED_SEARCH_AGGREGATE_STORE,
      useClass: SavedSearchAggregateStore,
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
      provide: COMPANY_READ_REPOSITORY,
      useClass: PrismaCompanyReadRepository,
    },
    {
      provide: REFERENCE_DATA_REPOSITORY,
      useClass: PrismaReferenceDataRepository,
    },
    {
      provide: SAVED_SEARCH_READ_REPOSITORY,
      useClass: PrismaSavedSearchReadRepository,
    },

    // Projections
    TransportProjection,
    LoadProjection,
    TripProjection,
    BidProjection,
    BookingProjection,
    BoardProjection,
    CompanyProjection,
    SavedSearchProjection,

    // Handlers
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class MainModule {}
