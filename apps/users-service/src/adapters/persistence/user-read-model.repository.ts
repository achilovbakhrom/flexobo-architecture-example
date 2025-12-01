import { Injectable, Inject } from '@nestjs/common';
import {
  IUserReadModelRepository,
  UserReadModelDto,
  VersionedUpsertOptions,
  UserRole,
  UserStatus,
  UserType,
  AuthPlatform,
} from '../../ports';

interface UserReadModelPrismaClient {
  user: {
    findUnique: (args: any) => Promise<any>;
    upsert: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaUserReadModelRepository implements IUserReadModelRepository {
  constructor(@Inject('PrismaClient') private readonly prisma: UserReadModelPrismaClient) {}

  async findById(userId: string): Promise<UserReadModelDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return user ? this.mapToDto(user) : null;
  }

  async findByEmail(email: string): Promise<UserReadModelDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.mapToDto(user) : null;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserReadModelDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    return user ? this.mapToDto(user) : null;
  }

  async findByTelegramId(telegramId: string): Promise<UserReadModelDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    return user ? this.mapToDto(user) : null;
  }

  async upsert(
    user: Omit<UserReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        uniqueId: user.uniqueId,
        email: user.email,
        phoneNumber: user.phoneNumber,
        telegramId: user.telegramId,
        passwordHash: user.passwordHash,
        fio: user.fio,
        avatar: user.avatar,
        role: user.role,
        userType: user.userType,
        status: user.status,
        language: user.language,
        isPrivacyPolicyAccepted: user.isPrivacyPolicyAccepted,
        isSubscribedNewsletter: user.isSubscribedNewsletter,
        platform: user.platform,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
        updatedAt: user.updatedAt,
      },
      update: {
        uniqueId: user.uniqueId,
        email: user.email,
        phoneNumber: user.phoneNumber,
        telegramId: user.telegramId,
        passwordHash: user.passwordHash,
        fio: user.fio,
        avatar: user.avatar,
        role: user.role,
        userType: user.userType,
        status: user.status,
        language: user.language,
        isPrivacyPolicyAccepted: user.isPrivacyPolicyAccepted,
        isSubscribedNewsletter: user.isSubscribedNewsletter,
        platform: user.platform,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
        updatedAt: user.updatedAt,
      },
    });

    return true;
  }

  async updateProfile(
    userId: string,
    data: {
      fio?: string;
      phoneNumber?: string;
      language?: string;
      avatar?: string;
    }
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fio !== undefined && { fio: data.fio }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        updatedAt: new Date(),
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });
  }

  async updateTelegramId(userId: string, telegramId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramId,
        updatedAt: new Date(),
      },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async getVersion(userId: string): Promise<number> {
    // For simplicity, we're not tracking versions in the read model
    // In a production system, you might add a version column
    return 0;
  }

  async isEventProcessed(userId: string, eventId: string): Promise<boolean> {
    // For simplicity, we're not tracking processed events
    // In a production system, you might maintain an event log table
    return false;
  }

  private mapToDto(user: any): UserReadModelDto {
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
