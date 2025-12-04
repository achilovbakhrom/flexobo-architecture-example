import { Injectable, Inject } from '@nestjs/common';
import {
  ITokenRepository,
  CreateRefreshTokenData,
  IRefreshToken,
  ITokenBlacklist,
} from '../../ports';
import { TokenPrismaClient } from './prisma-types';

@Injectable()
export class PrismaTokenRepository implements ITokenRepository {
  constructor(@Inject('PrismaClient') private readonly prisma: TokenPrismaClient) {}

  async findRefreshToken(token: string): Promise<IRefreshToken | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) return null;

    return {
      id: refreshToken.id,
      userId: refreshToken.userId,
      token: refreshToken.token,
      jti: refreshToken.jti,
      expiresAt: refreshToken.expiresAt,
      revokedAt: refreshToken.revokedAt,
      createdAt: refreshToken.createdAt,
    };
  }

  async createRefreshToken(data: CreateRefreshTokenData): Promise<IRefreshToken> {
    const token = await this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        token: data.token,
        jti: data.jti,
        expiresAt: data.expiresAt,
      },
    });

    return {
      id: token.id,
      userId: token.userId,
      token: token.token,
      jti: token.jti,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      createdAt: token.createdAt,
    };
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const blacklisted = await this.prisma.tokenBlacklist.findUnique({
      where: { jti },
    });
    return !!blacklisted;
  }

  async blacklistToken(
    jti: string,
    reason: string,
    expiresAt: Date
  ): Promise<ITokenBlacklist> {
    const token = await this.prisma.tokenBlacklist.create({
      data: {
        jti,
        reason,
        expiresAt,
      },
    });

    return {
      id: token.id,
      jti: token.jti,
      reason: token.reason,
      expiresAt: token.expiresAt,
      blacklistedAt: token.blacklistedAt,
    };
  }
}
