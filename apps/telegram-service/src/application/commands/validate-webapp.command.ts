import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure } from '@flexobo/core';
import { v4 as uuidv4 } from 'uuid';
import { TELEGRAM_BOT_SERVICE, ITelegramBotService } from '../../ports/telegram-bot.port';
import { TELEGRAM_USER_REPOSITORY, ITelegramUserRepository } from '../../ports/telegram-user.repository';

export class ValidateWebAppCommand implements ICommand {
  constructor(public readonly initData: string) {}
}

export interface ValidateWebAppResult {
  valid: boolean;
  telegramId?: string;
  userId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  message: string;
}

@Injectable()
@CommandHandler(ValidateWebAppCommand)
export class ValidateWebAppHandler implements ICommandHandler<ValidateWebAppCommand, ValidateWebAppResult> {
  constructor(
    @Inject(TELEGRAM_BOT_SERVICE) private readonly telegramBot: ITelegramBotService,
    @Inject(TELEGRAM_USER_REPOSITORY) private readonly telegramUserRepository: ITelegramUserRepository
  ) {}

  async execute(command: ValidateWebAppCommand): Promise<Result<ValidateWebAppResult, Error>> {
    try {
      // Validate WebApp data
      const validation = await this.telegramBot.validateWebAppData(command.initData);

      if (!validation.valid) {
        return new Success({
          valid: false,
          message: 'Invalid WebApp data',
        });
      }

      if (!validation.telegramId) {
        return new Success({
          valid: false,
          message: 'User information not found',
        });
      }

      // Check if user exists
      let telegramUser = await this.telegramUserRepository.findByTelegramId(validation.telegramId);

      if (!telegramUser) {
        // Create new telegram user
        await this.telegramUserRepository.create({
          id: uuidv4(),
          telegramId: validation.telegramId,
          username: validation.username,
          firstName: validation.firstName,
          lastName: validation.lastName,
        });
        telegramUser = await this.telegramUserRepository.findByTelegramId(validation.telegramId);
      } else {
        // Update user info if changed
        await this.telegramUserRepository.update(validation.telegramId, {
          username: validation.username,
          firstName: validation.firstName,
          lastName: validation.lastName,
        });
      }

      return new Success({
        valid: true,
        telegramId: validation.telegramId,
        userId: telegramUser?.userId || undefined,
        username: validation.username,
        firstName: validation.firstName,
        lastName: validation.lastName,
        message: 'WebApp validated successfully',
      });
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
