import { AuthPlatform, UserRole, UserStatus, UserType } from './user.enums';

export interface IUser {
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

export interface IRefreshToken {
  id: string;
  userId: string;
  token: string;
  jti: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
}

export interface ITokenBlacklist {
  id: string;
  jti: string;
  reason?: string | null;
  expiresAt: Date;
  blacklistedAt: Date;
}

export interface ITokenPayload {
  sub: string; // user id
  email?: string;
  phoneNumber?: string;
  role: string;
  jti: string; // JWT ID for blacklisting
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IValidateTokenResult {
  valid: boolean;
  userId?: string;
  role?: string;
  jti?: string;
  error?: string;
}

export type AuthMethod = 'PHONE_NUMBER' | 'EMAIL';

export interface IOTP {
  id: string;
  code: number;
  codeHash: string;
  authMethod: AuthMethod;
  phoneNumber?: string | null;
  email?: string | null;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}
