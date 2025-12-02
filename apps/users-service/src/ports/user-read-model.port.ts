import { AuthPlatform, UserRole, UserStatus, UserType } from './user.enums';

export interface UserReadModelDto {
  id: string;
  uniqueId: string;
  email?: string | null;
  phoneNumber?: string | null;
  telegramId?: string | null;
  passwordHash: string;
  fio: string;
  avatar?: string | null;
  role: UserRole;
  userType?: UserType | null;
  status: UserStatus;
  language: string;
  isPrivacyPolicyAccepted: boolean;
  isSubscribedNewsletter: boolean;
  platform?: AuthPlatform | null;
  isVerified: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VersionedUpsertOptions {
  eventId?: string;
  expectedVersion?: number;
  version?: number;
}

export interface IUserReadModelRepository {
  findById(userId: string): Promise<UserReadModelDto | null>;

  findByEmail(email: string): Promise<UserReadModelDto | null>;

  findByPhoneNumber(phoneNumber: string): Promise<UserReadModelDto | null>;

  findByTelegramId(telegramId: string): Promise<UserReadModelDto | null>;

  upsert(
    user: Omit<UserReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean>;

  updateProfile(
    userId: string,
    data: {
      fio?: string;
      phoneNumber?: string;
      language?: string;
      avatar?: string;
    }
  ): Promise<void>;

  updatePassword(userId: string, passwordHash: string): Promise<void>;

  updateTelegramId(userId: string, telegramId: string): Promise<void>;

  updateLastLogin(userId: string): Promise<void>;

  updateStatus(userId: string, status: UserStatus): Promise<void>;

  delete(userId: string): Promise<void>;

  getVersion(userId: string): Promise<number>;

  isEventProcessed(userId: string, eventId: string): Promise<boolean>;
}

export const USER_READ_MODEL_REPOSITORY = Symbol('IUserReadModelRepository');
