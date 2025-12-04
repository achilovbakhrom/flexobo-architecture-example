import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from './prisma.module';

// Controllers
import { PlanController } from './adapters/http/v1/plan.controller';
import { SubscriptionController } from './adapters/http/v1/subscription.controller';
import { PaymentController } from './adapters/http/v1/payment.controller';
import { InvoiceController } from './adapters/http/v1/invoice.controller';
import { StripeWebhookController } from './adapters/http/webhooks/stripe.webhook.controller';
import { ClickWebhookController } from './adapters/http/webhooks/click.webhook.controller';
import { BillingGrpcController } from './adapters/grpc/billing-grpc.controller';

// Command Handlers
import { PlanCommandHandlers } from './application/commands/plan';
import { SubscriptionCommandHandlers } from './application/commands/subscription';
import { PaymentCommandHandlers } from './application/commands/payment';
import { InvoiceCommandHandlers } from './application/commands/invoice';

// Query Handlers
import { PlanQueryHandlers } from './application/queries/plan';
import { SubscriptionQueryHandlers } from './application/queries/subscription';
import { PaymentQueryHandlers } from './application/queries/payment';
import { InvoiceQueryHandlers } from './application/queries/invoice';

// Aggregate Stores
import { PlanAggregateStore } from './adapters/persistence/plan-aggregate.store';
import { SubscriptionAggregateStore } from './adapters/persistence/subscription-aggregate.store';
import { PaymentAggregateStore } from './adapters/persistence/payment-aggregate.store';
import { InvoiceAggregateStore } from './adapters/persistence/invoice-aggregate.store';

// Read Repositories
import { PlanReadRepository } from './adapters/persistence/read-model/plan.repository';
import { SubscriptionReadRepository } from './adapters/persistence/read-model/subscription.repository';
import { PaymentReadRepository } from './adapters/persistence/read-model/payment.repository';
import { InvoiceReadRepository } from './adapters/persistence/read-model/invoice.repository';

// Projections
import { PlanProjection } from './adapters/eventbus/projection/plan.projection';
import { SubscriptionProjection } from './adapters/eventbus/projection/subscription.projection';
import { PaymentProjection } from './adapters/eventbus/projection/payment.projection';
import { InvoiceProjection } from './adapters/eventbus/projection/invoice.projection';

// Publishers and Consumers
import { DomainEventsPublisher } from './adapters/eventbus/publisher/domain-events.publisher';
import { UsageEventsConsumer } from './adapters/eventbus/consumer/usage-events.consumer';

// Payment Providers
import { StripeProvider } from './adapters/payment-providers/stripe.provider';
import { ClickProvider } from './adapters/payment-providers/click.provider';

// gRPC Clients
import { UsersGrpcClient } from './adapters/grpc/users-grpc.client';

// Port tokens
import { PLAN_AGGREGATE_STORE, PLAN_READ_REPOSITORY } from './ports/plan.repository';
import { SUBSCRIPTION_AGGREGATE_STORE, SUBSCRIPTION_READ_REPOSITORY } from './ports/subscription.repository';
import { PAYMENT_AGGREGATE_STORE, PAYMENT_READ_REPOSITORY } from './ports/payment.repository';
import { INVOICE_AGGREGATE_STORE, INVOICE_READ_REPOSITORY } from './ports/invoice.repository';

const CommandHandlers = [
  ...PlanCommandHandlers,
  ...SubscriptionCommandHandlers,
  ...PaymentCommandHandlers,
  ...InvoiceCommandHandlers,
];

const QueryHandlers = [
  ...PlanQueryHandlers,
  ...SubscriptionQueryHandlers,
  ...PaymentQueryHandlers,
  ...InvoiceQueryHandlers,
];

const Projections = [
  PlanProjection,
  SubscriptionProjection,
  PaymentProjection,
  InvoiceProjection,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CqrsModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RABBITMQ_URL',
                'amqp://guest:guest@localhost:5672',
              ),
            ],
            queue: 'billing_events',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [
    PlanController,
    SubscriptionController,
    PaymentController,
    InvoiceController,
    StripeWebhookController,
    ClickWebhookController,
    BillingGrpcController,
  ],
  providers: [
    // Command Handlers
    ...CommandHandlers,

    // Query Handlers
    ...QueryHandlers,

    // Aggregate Stores
    {
      provide: PLAN_AGGREGATE_STORE,
      useClass: PlanAggregateStore,
    },
    {
      provide: SUBSCRIPTION_AGGREGATE_STORE,
      useClass: SubscriptionAggregateStore,
    },
    {
      provide: PAYMENT_AGGREGATE_STORE,
      useClass: PaymentAggregateStore,
    },
    {
      provide: INVOICE_AGGREGATE_STORE,
      useClass: InvoiceAggregateStore,
    },

    // Read Repositories
    {
      provide: PLAN_READ_REPOSITORY,
      useClass: PlanReadRepository,
    },
    {
      provide: SUBSCRIPTION_READ_REPOSITORY,
      useClass: SubscriptionReadRepository,
    },
    {
      provide: PAYMENT_READ_REPOSITORY,
      useClass: PaymentReadRepository,
    },
    {
      provide: INVOICE_READ_REPOSITORY,
      useClass: InvoiceReadRepository,
    },

    // Projections
    ...Projections,

    // Publishers and Consumers
    DomainEventsPublisher,
    UsageEventsConsumer,

    // Payment Providers
    StripeProvider,
    ClickProvider,

    // gRPC Clients
    UsersGrpcClient,
  ],
  exports: [
    PLAN_AGGREGATE_STORE,
    PLAN_READ_REPOSITORY,
    SUBSCRIPTION_AGGREGATE_STORE,
    SUBSCRIPTION_READ_REPOSITORY,
    PAYMENT_AGGREGATE_STORE,
    PAYMENT_READ_REPOSITORY,
    INVOICE_AGGREGATE_STORE,
    INVOICE_READ_REPOSITORY,
  ],
})
export class BillingModule {}
