import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import {
  CqrsModule,
  MessagingModule,
  EventStoreModule,
  OutboxModule,
  MESSAGE_PUBLISHER,
  SnapshotModule,
  EventBufferModule,
} from '@flexobo/core';
import { PrismaModule } from './prisma.module';
import { AuthController } from './adapters/http/v1/auth.controller';
import { RoleController } from './adapters/http/v1/role.controller';
import { UsersController } from './adapters/http/v1/users.controller';
import { UsersGrpcController } from './adapters/grpc/users.grpc.controller';
import { JwtAuthGuard } from './adapters/http/guards';
import configuration from './config/configuration';
import { ReferenceDataGrpcClient } from './adapters/grpc/reference-data-grpc.client';

// Ports
import {
  USER_REPOSITORY,
  USER_READ_MODEL_REPOSITORY,
  TOKEN_REPOSITORY,
  TOKEN_SERVICE,
  PASSWORD_SERVICE,
  OTP_SERVICE,
  SMS_SERVICE,
  EMAIL_SERVICE,
  GOOGLE_AUTH_SERVICE,
  ROLE_REPOSITORY,
  INVITATION_REPOSITORY,
  COMPANY_MEMBERSHIP_REPOSITORY,
  REFERENCE_DATA_SERVICE,
} from './ports';
import { USER_AGGREGATE_STORE } from './ports/user-store.port';

// Adapters - Persistence
import {
  PrismaUserRepository,
  PrismaUserReadModelRepository,
  PrismaTokenRepository,
  UserAggregateStore,
  PrismaRoleRepository,
  PrismaInvitationRepository,
  PrismaCompanyMembershipRepository,
} from './adapters/persistence';

// Adapters - Services
import {
  JwtTokenService,
  BcryptPasswordService,
  OTPService,
  SmsService,
  EmailService,
  GoogleAuthService,
} from './adapters/services';

// Adapters - Eventbus
import { UserProjection } from './adapters/eventbus/projection/user.projection';

// Notification Resolvers
import {
  USER_NOTIFICATION_RESOLVER,
  UserNotificationResolver,
} from './adapters/eventbus/notification-resolvers';

// Command Handlers
import {
  RegisterUserHandler,
  RegisterWithTelegramHandler,
  LoginUserHandler,
  LoginWithTelegramHandler,
  RefreshTokenHandler,
  LogoutUserHandler,
  UpdateUserProfileHandler,
  ChangePasswordHandler,
  ResetPasswordHandler,
  LinkTelegramHandler,
  SendOTPHandler,
  VerifyOTPHandler,
  ForgotPasswordHandler,
  AuthWithGoogleHandler,
  RoleCommandHandlers,
  InvitationCommandHandlers,
  CompanyMembershipCommandHandlers,
} from './application/commands';

// Query Handlers
import {
  GetUserByIdHandler,
  GetUsersByIdsHandler,
  ValidateTokenHandler,
  IsTokenBlacklistedHandler,
  RoleQueryHandlers,
  InvitationQueryHandlers,
  CompanyMembershipQueryHandlers,
} from './application/queries';

const CommandHandlers = [
  RegisterUserHandler,
  RegisterWithTelegramHandler,
  LoginUserHandler,
  LoginWithTelegramHandler,
  RefreshTokenHandler,
  LogoutUserHandler,
  UpdateUserProfileHandler,
  ChangePasswordHandler,
  ResetPasswordHandler,
  LinkTelegramHandler,
  SendOTPHandler,
  VerifyOTPHandler,
  ForgotPasswordHandler,
  AuthWithGoogleHandler,
  ...RoleCommandHandlers,
  ...InvitationCommandHandlers,
  ...CompanyMembershipCommandHandlers,
];

const QueryHandlers = [
  GetUserByIdHandler,
  GetUsersByIdsHandler,
  ValidateTokenHandler,
  IsTokenBlacklistedHandler,
  ...RoleQueryHandlers,
  ...InvitationQueryHandlers,
  ...CompanyMembershipQueryHandlers,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.accessTokenExpiry', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    MessagingModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        config: {
          url: configService.get('rabbitmq.url', 'amqp://localhost:5672'),
          exchange: configService.get('rabbitmq.exchange', 'flexobo.events'),
          retry: {
            backoffMultiplier: 1,
            maxRetries: 10,
            initialDelayMs: 1000,
            maxDelayMs: 30000,
          },
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
    SnapshotModule.forRootAsync({
      imports: [PrismaModule],
      useFactory: (prismaClient: unknown) => ({
        prismaClient,
        strategy: {
          snapshotFrequency: 20,
          keepLatestSnapshots: 2,
          enabled: true,
        },
      }),
      inject: ['PrismaClient'],
    }),
    EventBufferModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: configService.get('redis.url', 'redis://localhost:6379'),
        config: {
          prefix: 'users:evtbuf',
          eventTtl: 600, // 10 minutes
          lockTtlMs: 5000,
        },
      }),
      inject: [ConfigService],
    }),
    // gRPC Client for Main Service (Reference Data)
    ClientsModule.registerAsync([
      {
        name: 'REFERENCE_DATA_GRPC_CLIENT',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'reference_data',
            protoPath: join(
              process.cwd(),
              'libs/shared-kernel/src/lib/grpc/proto/reference-data.proto'
            ),
            url: configService.get('mainService.grpcUrl', 'localhost:50051'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AuthController, RoleController, UsersController, UsersGrpcController],
  providers: [
    // Port implementations
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: USER_READ_MODEL_REPOSITORY,
      useClass: PrismaUserReadModelRepository,
    },
    {
      provide: TOKEN_REPOSITORY,
      useClass: PrismaTokenRepository,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
    {
      provide: PASSWORD_SERVICE,
      useClass: BcryptPasswordService,
    },
    {
      provide: OTP_SERVICE,
      useClass: OTPService,
    },
    {
      provide: SMS_SERVICE,
      useClass: SmsService,
    },
    {
      provide: EMAIL_SERVICE,
      useClass: EmailService,
    },
    {
      provide: GOOGLE_AUTH_SERVICE,
      useClass: GoogleAuthService,
    },
    {
      provide: USER_AGGREGATE_STORE,
      useClass: UserAggregateStore,
    },
    {
      provide: ROLE_REPOSITORY,
      useClass: PrismaRoleRepository,
    },
    {
      provide: INVITATION_REPOSITORY,
      useClass: PrismaInvitationRepository,
    },
    {
      provide: COMPANY_MEMBERSHIP_REPOSITORY,
      useClass: PrismaCompanyMembershipRepository,
    },
    // Reference Data Service (gRPC Client)
    {
      provide: REFERENCE_DATA_SERVICE,
      useClass: ReferenceDataGrpcClient,
    },
    // Notification Resolvers
    {
      provide: USER_NOTIFICATION_RESOLVER,
      useClass: UserNotificationResolver,
    },
    // Projections
    UserProjection,
    // Guards
    JwtAuthGuard,
    // Handlers need to be provided for DI
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class UsersModule {}
