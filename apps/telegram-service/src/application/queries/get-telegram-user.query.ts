import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { TELEGRAM_USER_REPOSITORY, ITelegramUserRepository, TelegramUserReadDto } from '../../ports/telegram-user.repository';

export class GetTelegramUserQuery implements IQuery<TelegramUserReadDto | null> {
  constructor(
    public readonly telegramId?: string,
    public readonly userId?: string
  ) {}
}

@Injectable()
@QueryHandler(GetTelegramUserQuery)
export class GetTelegramUserHandler implements IQueryHandler<GetTelegramUserQuery, TelegramUserReadDto | null> {
  constructor(
    @Inject(TELEGRAM_USER_REPOSITORY) private readonly telegramUserRepository: ITelegramUserRepository
  ) {}

  async execute(query: GetTelegramUserQuery): Promise<TelegramUserReadDto | null> {
    if (query.telegramId) {
      return this.telegramUserRepository.findByTelegramId(query.telegramId);
    }
    if (query.userId) {
      return this.telegramUserRepository.findByUserId(query.userId);
    }
    return null;
  }
}
