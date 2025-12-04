import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CqrsModule, MessagingModule, EventStoreModule, OutboxModule, MESSAGE_PUBLISHER, SnapshotModule } from '@flexobo/core';
import { PrismaModule } from './prisma.module';
import { AuthController } from './adapters/http/v1/auth.controller';
import { UsersGrpcController } from './adapters/grpc/users.grpc.controller';
import { JwtAuthGuard } from './adapters/http/guards';
import configuration from './config/configuration';

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
} from './ports';
import { USER_AGGREGATE_STORE } from './ports/user-store.port';

// Adapters - Persistence
import {
  PrismaUserRepository,
  PrismaUserReadModelRepository,
  PrismaTokenRepository,
  UserAggregateStore,
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
} from './application/commands';

// Query Handlers
import {
  GetUserByIdHandler,
  GetUsersByIdsHandler,
  ValidateTokenHandler,
  IsTokenBlacklistedHandler,
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
];

const QueryHandlers = [
  GetUserByIdHandler,
  GetUsersByIdsHandler,
  ValidateTokenHandler,
  IsTokenBlacklistedHandler,
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
      messagePublisher: { provide: 'IMessagePublisher', useExisting: MESSAGE_PUBLISHER },
    }),
    SnapshotModule.forRootAsync({
      imports: [PrismaModule],
      useFactory: (prismaClient: unknown) => ({
        prismaClient,
        strategy: { snapshotFrequency: 20, keepLatestSnapshots: 2, enabled: true },
      }),
      inject: ['PrismaClient'],
    }),
  ],
  controllers: [AuthController, UsersGrpcController],
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
