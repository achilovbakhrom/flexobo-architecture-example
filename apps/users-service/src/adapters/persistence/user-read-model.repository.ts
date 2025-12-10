import { Injectable, Inject } from '@nestjs/common';
import {
  IUserReadModelRepository,
  UserReadModelDto,
  VersionedUpsertOptions,
  UserStatus,
} from '../../ports';
import { UserPrismaClient } from './prisma-types';

@Injectable()
export class PrismaUserReadModelRepository implements IUserReadModelRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: UserPrismaClient
  ) {}

  async findById(id: string): Promise<UserReadModelDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      uniqueId: user.uniqueId,
      email: user.email,
      phoneNumber: user.phoneNumber,
      telegramId: user.telegramId,
      googleId: user.googleId,
      passwordHash: user.passwordHash,
      fio: user.fio,
      avatar: user.avatar,
      countryId: user.countryId,
      city: user.city,
      role: user.role as any,
      userType: user.userType as any,
      status: user.status as any,
      language: user.language,
      isPrivacyPolicyAccepted: user.isPrivacyPolicyAccepted,
      isSubscribedNewsletter: user.isSubscribedNewsletter,
      platform: user.platform as any,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      version: user.version,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async upsert(
    user: Omit<UserReadModelDto, 'createdAt' | 'version'>,
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
        googleId: user.googleId,
        passwordHash: user.passwordHash,
        fio: user.fio,
        avatar: user.avatar,
        role: user.role,
        countryId: user.countryId,
        city: user.city,
        userType: user.userType,
        status: user.status,
        language: user.language,
        isPrivacyPolicyAccepted: user.isPrivacyPolicyAccepted,
        isSubscribedNewsletter: user.isSubscribedNewsletter,
        platform: user.platform,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
        updatedAt: user.updatedAt,
        version: options?.version ?? 1,
      },
      update: {
        uniqueId: user.uniqueId,
        email: user.email,
        phoneNumber: user.phoneNumber,
        telegramId: user.telegramId,
        googleId: user.googleId,
        passwordHash: user.passwordHash,
        fio: user.fio,
        avatar: user.avatar,
        role: user.role,
        countryId: user.countryId,
        city: user.city,
        userType: user.userType,
        status: user.status,
        language: user.language,
        isPrivacyPolicyAccepted: user.isPrivacyPolicyAccepted,
        isSubscribedNewsletter: user.isSubscribedNewsletter,
        platform: user.platform,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
        updatedAt: user.updatedAt,
        version: options?.version,
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
      countryId?: string;
      city?: string;
    },
    version?: number
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fio !== undefined && { fio: data.fio }),
        ...(data.phoneNumber !== undefined && {
          phoneNumber: data.phoneNumber,
        }),
        ...(data.countryId !== undefined && { countryId: data.countryId }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(version !== undefined && { version }),
        updatedAt: new Date(),
      },
    });
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
    version?: number
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        ...(version !== undefined && { version }),
        updatedAt: new Date(),
      },
    });
  }

  async updateTelegramId(
    userId: string,
    telegramId: string,
    version?: number
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramId,
        ...(version !== undefined && { version }),
        updatedAt: new Date(),
      },
    });
  }

  async updateGoogleId(
    userId: string,
    googleId: string,
    version?: number
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleId,
        ...(version !== undefined && { version }),
        updatedAt: new Date(),
      },
    });
  }

  async updateLastLogin(userId: string, version?: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        ...(version !== undefined && { version }),
        updatedAt: new Date(),
      },
    });
  }

  async updateStatus(
    userId: string,
    status: UserStatus,
    version?: number
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status,
        ...(version !== undefined && { version }),
        updatedAt: new Date(),
      },
    });
  }

  async updateIsVerified(
    userId: string,
    isVerified: boolean,
    version?: number
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified,
        ...(version !== undefined && { version }),
        updatedAt: new Date(),
      },
    });
  }

  async updateVersion(userId: string, version: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        version,
        updatedAt: new Date(),
      },
    });
  }
}
