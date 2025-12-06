import { AuthPlatform, UserRole, UserStatus, UserType } from './user.enums';

export interface UserReadModelDto {
  id: string;
  uniqueId: string;
  email?: string | null;
  phoneNumber?: string | null;
  telegramId?: string | null;
  googleId?: string | null;
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
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VersionedUpsertOptions {
  version?: number;
}

export interface IUserReadModelRepository {
  findById(id: string): Promise<UserReadModelDto | null>;

  upsert(
    user: Omit<UserReadModelDto, 'createdAt' | 'version'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean>;

  updateProfile(
    userId: string,
    data: {
      fio?: string;
      phoneNumber?: string;
      language?: string;
      avatar?: string;
    },
    version?: number
  ): Promise<void>;

  updatePassword(userId: string, passwordHash: string, version?: number): Promise<void>;

  updateTelegramId(userId: string, telegramId: string, version?: number): Promise<void>;

  updateGoogleId(userId: string, googleId: string, version?: number): Promise<void>;

  updateLastLogin(userId: string, version?: number): Promise<void>;

  updateStatus(userId: string, status: UserStatus, version?: number): Promise<void>;

  updateIsVerified(userId: string, isVerified: boolean, version?: number): Promise<void>;

  updateVersion(userId: string, version: number): Promise<void>;
}

export const USER_READ_MODEL_REPOSITORY = Symbol('IUserReadModelRepository');
