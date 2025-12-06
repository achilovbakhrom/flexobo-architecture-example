export const TELEGRAM_USER_REPOSITORY = Symbol('TELEGRAM_USER_REPOSITORY');

export interface TelegramUserReadDto {
  id: string;
  telegramId: string;
  userId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITelegramUserRepository {
  findById(id: string): Promise<TelegramUserReadDto | null>;
  findByTelegramId(telegramId: string): Promise<TelegramUserReadDto | null>;
  findByUserId(userId: string): Promise<TelegramUserReadDto | null>;
  create(data: {
    id: string;
    telegramId: string;
    userId?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  }): Promise<void>;
  linkUser(telegramId: string, userId: string): Promise<void>;
  unlinkUser(telegramId: string): Promise<void>;
  update(telegramId: string, data: {
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  }): Promise<void>;
}
