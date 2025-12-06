import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  CqrsModule,
  MessagingModule,
} from '@flexobo/core';
import { PrismaModule } from './prisma.module';
import configuration from './config/configuration';

// Ports
import { TELEGRAM_BOT_SERVICE } from './ports/telegram-bot.port';
import { OTP_REPOSITORY } from './ports/otp.repository';
import { PUBLICATION_REPOSITORY } from './ports/publication.repository';
import { TELEGRAM_USER_REPOSITORY } from './ports/telegram-user.repository';

// Adapters - Bot
import { TelegramBotService } from './adapters/bot/telegram-bot.service';

// Adapters - Persistence
import {
  PrismaOtpRepository,
  PrismaPublicationRepository,
  PrismaTelegramUserRepository,
} from './adapters/persistence';

// Adapters - HTTP
import { TelegramController } from './adapters/http/v1/telegram.controller';

// Command Handlers
import { CommandHandlers } from './application/commands';

// Query Handlers
import { QueryHandlers } from './application/queries';

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
  ],
  controllers: [TelegramController],
  providers: [
    // Bot Service
    {
      provide: TELEGRAM_BOT_SERVICE,
      useClass: TelegramBotService,
    },
    TelegramBotService,

    // Repositories
    {
      provide: OTP_REPOSITORY,
      useClass: PrismaOtpRepository,
    },
    {
      provide: PUBLICATION_REPOSITORY,
      useClass: PrismaPublicationRepository,
    },
    {
      provide: TELEGRAM_USER_REPOSITORY,
      useClass: PrismaTelegramUserRepository,
    },

    // Command & Query handlers
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class TelegramModule {}
