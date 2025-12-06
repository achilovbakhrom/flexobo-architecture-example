import { Injectable, Inject } from '@nestjs/common';
import { ITelegramUserRepository, TelegramUserReadDto } from '../../ports/telegram-user.repository';

interface TelegramUserPrismaClient {
  telegramUserReadModel: {
    findUnique: (args: unknown) => Promise<TelegramUserReadDto | null>;
    findFirst: (args: unknown) => Promise<TelegramUserReadDto | null>;
    create: (args: unknown) => Promise<TelegramUserReadDto>;
    update: (args: unknown) => Promise<TelegramUserReadDto>;
  };
}

@Injectable()
export class PrismaTelegramUserRepository implements ITelegramUserRepository {
  constructor(@Inject('PrismaClient') private readonly prisma: TelegramUserPrismaClient) {}

  async findById(id: string): Promise<TelegramUserReadDto | null> {
    return this.prisma.telegramUserReadModel.findUnique({
      where: { id },
    });
  }

  async findByTelegramId(telegramId: string): Promise<TelegramUserReadDto | null> {
    return this.prisma.telegramUserReadModel.findUnique({
      where: { telegramId },
    });
  }

  async findByUserId(userId: string): Promise<TelegramUserReadDto | null> {
    return this.prisma.telegramUserReadModel.findFirst({
      where: { userId },
    });
  }

  async create(data: {
    id: string;
    telegramId: string;
    userId?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  }): Promise<void> {
    await this.prisma.telegramUserReadModel.create({
      data: {
        id: data.id,
        telegramId: data.telegramId,
        userId: data.userId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        languageCode: data.languageCode || 'en',
        isActive: true,
      },
    });
  }

  async linkUser(telegramId: string, userId: string): Promise<void> {
    await this.prisma.telegramUserReadModel.update({
      where: { telegramId },
      data: { userId },
    });
  }

  async unlinkUser(telegramId: string): Promise<void> {
    await this.prisma.telegramUserReadModel.update({
      where: { telegramId },
      data: { userId: null },
    });
  }

  async update(telegramId: string, data: {
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  }): Promise<void> {
    await this.prisma.telegramUserReadModel.update({
      where: { telegramId },
      data,
    });
  }
}
