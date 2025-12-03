import { IRefreshToken, ITokenBlacklist } from './user.interface';

export interface CreateRefreshTokenData {
  userId: string;
  token: string;
  jti: string;
  expiresAt: Date;
}

export interface ITokenRepository {
  // Refresh tokens
  findRefreshToken(token: string): Promise<IRefreshToken | null>;
  createRefreshToken(data: CreateRefreshTokenData): Promise<IRefreshToken>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;

  // Token blacklist
  isTokenBlacklisted(jti: string): Promise<boolean>;
  blacklistToken(jti: string, reason: string, expiresAt: Date): Promise<ITokenBlacklist>;
}

export const TOKEN_REPOSITORY = Symbol('ITokenRepository');
