import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CqrsModule } from '@flexobo/core';
import { PrismaModule } from './prisma.module';
import { AuthController } from './adapters/http/v1/auth.controller';
import { UsersGrpcController } from './adapters/grpc/users.grpc.controller';
import { JwtAuthGuard } from './adapters/http/guards';
import configuration from './config/configuration';

// Ports
import {
  USER_REPOSITORY,
  TOKEN_REPOSITORY,
  TOKEN_SERVICE,
  PASSWORD_SERVICE,
} from './ports';

// Adapters
import {
  PrismaUserRepository,
  PrismaTokenRepository,
} from './adapters/persistence';
import { JwtTokenService, BcryptPasswordService } from './adapters/services';

// Command Handlers
import {
  RegisterUserHandler,
  LoginUserHandler,
  RefreshTokenHandler,
  LogoutUserHandler,
  UpdateUserProfileHandler,
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
  LoginUserHandler,
  RefreshTokenHandler,
  LogoutUserHandler,
  UpdateUserProfileHandler,
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
    CqrsModule.forRoot({
      commandHandlers: CommandHandlers,
      queryHandlers: QueryHandlers,
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
    // Guards
    JwtAuthGuard,
    // Handlers need to be provided for DI
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class AuthModule {}
