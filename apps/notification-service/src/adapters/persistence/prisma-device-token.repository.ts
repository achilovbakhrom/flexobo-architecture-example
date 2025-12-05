import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../prisma.module';
import {
  IDeviceTokenRepository,
  DeviceTokenEntity,
} from '../../ports/device-token.repository';
import { DevicePlatform } from '../../domain/constants/enums';

interface DeviceTokenPrismaClient {
  deviceToken: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    deleteMany: (args: any) => Promise<{ count: number }>;
  };
}

@Injectable()
export class PrismaDeviceTokenRepository implements IDeviceTokenRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: DeviceTokenPrismaClient
  ) {}

  async findByUserId(userId: string): Promise<DeviceTokenEntity[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
    });
    return tokens.map(this.mapToEntity);
  }

  async findByUserIds(userIds: string[]): Promise<DeviceTokenEntity[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: { in: userIds } },
    });
    return tokens.map(this.mapToEntity);
  }

  async findByToken(token: string): Promise<DeviceTokenEntity | null> {
    const deviceToken = await this.prisma.deviceToken.findUnique({
      where: { token },
    });
    return deviceToken ? this.mapToEntity(deviceToken) : null;
  }

  async findAll(): Promise<DeviceTokenEntity[]> {
    const tokens = await this.prisma.deviceToken.findMany({});
    return tokens.map(this.mapToEntity);
  }

  async save(
    deviceToken: Omit<DeviceTokenEntity, 'id' | 'createdAt' | 'lastUsedAt'>
  ): Promise<DeviceTokenEntity> {
    const created = await this.prisma.deviceToken.create({
      data: {
        userId: deviceToken.userId,
        token: deviceToken.token,
        platform: deviceToken.platform,
      },
    });
    return this.mapToEntity(created);
  }

  async updateLastUsed(token: string): Promise<void> {
    await this.prisma.deviceToken.update({
      where: { token },
      data: { lastUsedAt: new Date() },
    });
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.deviceToken.delete({
      where: { token },
    }).catch(() => {
      // Ignore if not found
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({
      where: { userId },
    });
  }

  private mapToEntity(token: {
    id: string;
    userId: string;
    token: string;
    platform: string;
    createdAt: Date;
    lastUsedAt: Date;
  }): DeviceTokenEntity {
    return {
      id: token.id,
      userId: token.userId,
      token: token.token,
      platform: token.platform as DevicePlatform,
      createdAt: token.createdAt,
      lastUsedAt: token.lastUsedAt,
    };
  }
}
