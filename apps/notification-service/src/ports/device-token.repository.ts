import { DevicePlatform } from '../domain/constants/enums';

export const DEVICE_TOKEN_REPOSITORY = Symbol('DEVICE_TOKEN_REPOSITORY');

export interface DeviceTokenEntity {
  id: string;
  userId: string;
  token: string;
  platform: DevicePlatform;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface IDeviceTokenRepository {
  findByUserId(userId: string): Promise<DeviceTokenEntity[]>;
  findByUserIds(userIds: string[]): Promise<DeviceTokenEntity[]>;
  findByToken(token: string): Promise<DeviceTokenEntity | null>;
  findAll(): Promise<DeviceTokenEntity[]>;
  findPaginated(offset: number, limit: number): Promise<DeviceTokenEntity[]>;
  save(deviceToken: Omit<DeviceTokenEntity, 'id' | 'createdAt' | 'lastUsedAt'>): Promise<DeviceTokenEntity>;
  updateLastUsed(token: string): Promise<void>;
  deleteByToken(token: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
