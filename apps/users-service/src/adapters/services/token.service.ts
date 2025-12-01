import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import {
  ITokenService,
  ITokenRepository,
  TOKEN_REPOSITORY,
  ITokenPayload,
  ITokenPair,
} from '../../ports';

enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

interface RefreshTokenPayload extends ITokenPayload {
  type: TokenType;
}

const DEFAULT_ACCESS_TOKEN_EXPIRY = '7d';
const DEFAULT_REFRESH_TOKEN_EXPIRY = '30d';

/**
 * Converts a human-readable time string to milliseconds.
 * Supported formats: s (seconds), m (minutes), h (hours), d (days), w (weeks)
 * @example parseTimeToMs('15m') // 900000
 * @example parseTimeToMs('7d')  // 604800000
 * @example parseTimeToMs('1h')  // 3600000
 */
function parseTimeToMs(time: string): number {
  const match = time.match(/^(\d+)(s|m|h|d|w)$/);

  if (!match) {
    throw new Error(
      `Invalid time format: ${time}. Expected format: <number><unit> (e.g., 15m, 7d, 1h)`
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

@Injectable()
export class JwtTokenService implements ITokenService {
  private readonly accessTokenExpiry: number;
  private readonly refreshTokenExpiry: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(TOKEN_REPOSITORY) private readonly tokenRepository: ITokenRepository
  ) {
    this.accessTokenExpiry = parseTimeToMs(
      this.configService.get<string>(
        'jwt.accessTokenExpiry',
        DEFAULT_ACCESS_TOKEN_EXPIRY
      )
    );
    this.refreshTokenExpiry = parseTimeToMs(
      this.configService.get<string>(
        'jwt.refreshTokenExpiry',
        DEFAULT_REFRESH_TOKEN_EXPIRY
      )
    );
  }

  async generateTokens(
    userId: string,
    email: string,
    role: string
  ): Promise<ITokenPair> {
    const jti = uuidv4();
    const refreshJti = uuidv4();

    const accessPayload: ITokenPayload = {
      sub: userId,
      email,
      role,
      jti,
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      email,
      role,
      jti: refreshJti,
      type: TokenType.REFRESH,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.refreshTokenExpiry,
    });

    const expiresAt = this.calculateExpiryDate(this.refreshTokenExpiry);

    await this.tokenRepository.createRefreshToken({
      userId,
      token: refreshToken,
      jti: refreshJti,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  verifyAccessToken(token: string): ITokenPayload {
    const payload = this.jwtService.verify<
      ITokenPayload & { type?: TokenType }
    >(token);

    if (payload.type === TokenType.REFRESH) {
      throw new Error('Invalid token type');
    }

    return payload;
  }

  verifyRefreshToken(token: string): ITokenPayload {
    const payload = this.jwtService.verify<RefreshTokenPayload>(token);

    if (payload.type !== TokenType.REFRESH) {
      throw new Error('Invalid token type');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
  }

  decodeToken(token: string): ITokenPayload | null {
    try {
      return this.jwtService.decode<ITokenPayload>(token);
    } catch {
      return null;
    }
  }

  private calculateExpiryDate(milliseconds: number): Date {
    return new Date(Date.now() + milliseconds);
  }
}
