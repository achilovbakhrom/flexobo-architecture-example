/**
 * Shared Prisma Record Types
 *
 * Consolidated type definitions for database records.
 * Used across repositories to ensure type safety with Prisma.
 */

export interface UserRecord {
  id: string;
  uniqueId: string;
  email: string | null;
  phoneNumber: string | null;
  telegramId: string | null;
  googleId: string | null;
  passwordHash: string;
  fio: string;
  avatar: string | null;
  role: string;
  userType: string | null;
  status: string;
  language: string;
  isPrivacyPolicyAccepted: boolean;
  isSubscribedNewsletter: boolean;
  platform: string | null;
  isVerified: boolean;
  lastLoginAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  token: string;
  jti: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface TokenBlacklistRecord {
  id: string;
  jti: string;
  reason: string | null;
  expiresAt: Date;
  blacklistedAt: Date;
}

/**
 * Prisma Client Interfaces
 */

export interface UserWhereUniqueInput {
  id?: string;
  email?: string;
  phoneNumber?: string;
  telegramId?: string;
  googleId?: string;
  uniqueId?: string;
}

export interface UserPrismaClient {
  user: {
    findUnique: (args: { where: UserWhereUniqueInput }) => Promise<UserRecord | null>;
    findMany: (args: { where: { id: { in: string[] } } }) => Promise<UserRecord[]>;
    create: (args: { data: Partial<UserRecord> }) => Promise<UserRecord>;
    update: (args: { where: { id: string }; data: Partial<UserRecord> }) => Promise<UserRecord>;
    upsert: (args: {
      where: { id: string };
      create: Partial<UserRecord>;
      update: Partial<UserRecord>;
    }) => Promise<UserRecord>;
  };
}

export interface TokenPrismaClient {
  refreshToken: {
    findUnique: (args: {
      where: { token?: string; id?: string; jti?: string };
    }) => Promise<RefreshTokenRecord | null>;
    create: (args: {
      data: Omit<RefreshTokenRecord, 'id' | 'revokedAt' | 'createdAt'>;
    }) => Promise<RefreshTokenRecord>;
    update: (args: {
      where: { id: string };
      data: Partial<RefreshTokenRecord>;
    }) => Promise<RefreshTokenRecord>;
    updateMany: (args: {
      where: { userId: string; revokedAt: null };
      data: Partial<RefreshTokenRecord>;
    }) => Promise<{ count: number }>;
  };
  tokenBlacklist: {
    findUnique: (args: {
      where: { jti: string };
    }) => Promise<TokenBlacklistRecord | null>;
    create: (args: {
      data: Omit<TokenBlacklistRecord, 'id' | 'blacklistedAt'>;
    }) => Promise<TokenBlacklistRecord>;
  };
}
