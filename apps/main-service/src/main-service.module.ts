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
import configuration from './config/configuration';

// HTTP Controllers

import { TransportTypeController } from './adapters/http/v1/transport-type.controller';

// Ports
import {
  TRANSPORT_TYPE_AGGREGATE_STORE,
  TRANSPORT_TYPE_READ_MODEL_REPOSITORY,
} from './ports';

// Adapters - Persistence
import {
  TransportTypeAggregateStore,
  PrismaTransportTypeReadModelRepository,
} from './adapters/persistence';

// Adapters - Eventbus
import { TransportTypeProjection } from './adapters/eventbus/projection';

// Command Handlers
import {
  CreateTransportTypeHandler,
  UpdateTransportTypeHandler,
  ActivateTransportTypeHandler,
  DeactivateTransportTypeHandler,
  AddTransportTypeTranslationHandler,
  UpdateTransportTypeTranslationHandler,
  DeleteTransportTypeTranslationHandler,
  DeleteTransportTypeHandler,
} from './application/commands';

// Query Handlers
import {
  GetTransportTypeByIdHandler,
  GetAllTransportTypesHandler,
  GetActiveTransportTypesHandler,
  SearchTransportTypesHandler,
} from './application/queries';

const CommandHandlers = [
  CreateTransportTypeHandler,
  UpdateTransportTypeHandler,
  ActivateTransportTypeHandler,
  DeactivateTransportTypeHandler,
  AddTransportTypeTranslationHandler,
  UpdateTransportTypeTranslationHandler,
  DeleteTransportTypeTranslationHandler,
  DeleteTransportTypeHandler,
];

const QueryHandlers = [
  GetTransportTypeByIdHandler,
  GetAllTransportTypesHandler,
  GetActiveTransportTypesHandler,
  SearchTransportTypesHandler,
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
      workerConfig: {
        pollingIntervalMs: 5000,
        batchSize: 100,
        enabled: true,
      },
      messagePublisher: {
        provide: 'IMessagePublisher',
        useExisting: MESSAGE_PUBLISHER,
      },
    }),
  ],
  controllers: [TransportTypeController],
  providers: [
    {
      provide: TRANSPORT_TYPE_AGGREGATE_STORE,
      useClass: TransportTypeAggregateStore,
    },

    {
      provide: TRANSPORT_TYPE_READ_MODEL_REPOSITORY,
      useClass: PrismaTransportTypeReadModelRepository,
    },
    // Projections
    TransportTypeProjection,
    // Handlers
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class MainServiceModule {}
