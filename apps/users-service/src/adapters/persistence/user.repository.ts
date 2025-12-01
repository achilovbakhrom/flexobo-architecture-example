import { Injectable, Inject } from '@nestjs/common';
import {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
  UserRole,
  UserStatus,
  UserType,
  AuthPlatform,
} from '../../ports';
import { IUser } from '../../ports/user.interface';

interface UserPrismaClient {
  user: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(@Inject('PrismaClient') private readonly prisma: UserPrismaClient) {}

  async findById(id: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.mapToUser(user) : null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.mapToUser(user) : null;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    return user ? this.mapToUser(user) : null;
  }

  async findByTelegramId(telegramId: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    return user ? this.mapToUser(user) : null;
  }

  async findByIds(ids: string[]): Promise<IUser[]> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
    });

    return users.map((user) => this.mapToUser(user));
  }

  async create(data: CreateUserData): Promise<IUser> {
    const user = await this.prisma.user.create({
      data: {
        uniqueId: data.uniqueId,
        fio: data.fio,
        passwordHash: data.passwordHash,
        phoneNumber: data.phoneNumber,
        telegramId: data.telegramId,
        email: data.email,
        isPrivacyPolicyAccepted: data.isPrivacyPolicyAccepted ?? false,
        isSubscribedNewsletter: data.isSubscribedNewsletter ?? false,
        platform: data.platform,
        userType: data.userType,
      },
    });

    return this.mapToUser(user);
  }

  async update(id: string, data: UpdateUserData): Promise<IUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fio: data.fio,
        phoneNumber: data.phoneNumber,
        language: data.language,
        avatar: data.avatar,
      },
    });

    return this.mapToUser(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async activate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async generateUniqueId(fio: string): Promise<string> {
    // Generate unique ID from FIO (transliterate and add counter if needed)
    const baseId = this.transliterate(fio).toLowerCase().replace(/\s+/g, '_');

    // Check if exists
    let uniqueId = baseId;
    let counter = 1;

    while (await this.prisma.user.findUnique({ where: { uniqueId } })) {
      uniqueId = `${baseId}_${counter}`;
      counter++;
    }

    return uniqueId;
  }

  private transliterate(text: string): string {
    const cyrillicToLatin: Record<string, string> = {
      а: 'a',
      б: 'b',
      в: 'v',
      г: 'g',
      д: 'd',
      е: 'e',
      ё: 'yo',
      ж: 'zh',
      з: 'z',
      и: 'i',
      й: 'y',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ф: 'f',
      х: 'kh',
      ц: 'ts',
      ч: 'ch',
      ш: 'sh',
      щ: 'shch',
      ъ: '',
      ы: 'y',
      ь: '',
      э: 'e',
      ю: 'yu',
      я: 'ya',
      А: 'A',
      Б: 'B',
      В: 'V',
      Г: 'G',
      Д: 'D',
      Е: 'E',
      Ё: 'Yo',
      Ж: 'Zh',
      З: 'Z',
      И: 'I',
      Й: 'Y',
      К: 'K',
      Л: 'L',
      М: 'M',
      Н: 'N',
      О: 'O',
      П: 'P',
      Р: 'R',
      С: 'S',
      Т: 'T',
      У: 'U',
      Ф: 'F',
      Х: 'Kh',
      Ц: 'Ts',
      Ч: 'Ch',
      Ш: 'Sh',
      Щ: 'Shch',
      Ъ: '',
      Ы: 'Y',
      Ь: '',
      Э: 'E',
      Ю: 'Yu',
      Я: 'Ya',
    };

    return text
      .split('')
      .map((char) => cyrillicToLatin[char] || char)
      .join('');
  }

  private mapToUser(user: any): IUser {
    return {
      id: user.id,
      uniqueId: user.uniqueId,
      email: user.email,
      phoneNumber: user.phoneNumber,
      telegramId: user.telegramId,
      passwordHash: user.passwordHash,
      fio: user.fio,
      avatar: user.avatar,
      role: user.role as UserRole,
      userType: user.userType as UserType | null,
      status: user.status as UserStatus,
      language: user.language,
      isPrivacyPolicyAccepted: user.isPrivacyPolicyAccepted,
      isSubscribedNewsletter: user.isSubscribedNewsletter,
      platform: user.platform as AuthPlatform | null,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
