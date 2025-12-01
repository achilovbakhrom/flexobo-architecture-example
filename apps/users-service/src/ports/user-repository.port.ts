import { AuthPlatform, UserType } from './user.enums';
import { IUser } from './user.interface';

export interface CreateUserData {
  uniqueId: string;
  fio: string;
  passwordHash: string;
  phoneNumber?: string;
  telegramId?: string;
  email?: string;
  isPrivacyPolicyAccepted?: boolean;
  isSubscribedNewsletter?: boolean;
  platform?: AuthPlatform;
  userType?: UserType;
}

export interface UpdateUserData {
  fio?: string;
  phoneNumber?: string;
  language?: string;
  avatar?: string;
}

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByPhoneNumber(phoneNumber: string): Promise<IUser | null>;
  findByTelegramId(telegramId: string): Promise<IUser | null>;
  findByIds(ids: string[]): Promise<IUser[]>;
  create(data: CreateUserData): Promise<IUser>;
  update(id: string, data: UpdateUserData): Promise<IUser>;
  updateLastLogin(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  activate(id: string): Promise<void>;
  generateUniqueId(fio: string): Promise<string>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
