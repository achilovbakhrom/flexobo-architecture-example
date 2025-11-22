/**
 * JWT Service for token generation and validation
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload, TokenValidationResult } from './auth.types';
import * as crypto from 'crypto';

export interface JwtConfig {
  secret: string;
  accessTokenExpiry?: number; // in seconds
  refreshTokenExpiry?: number; // in seconds
  issuer?: string;
  audience?: string;
}

@Injectable()
export class JwtService {
  private readonly config: Required<JwtConfig>;

  constructor(config: JwtConfig) {
    this.config = {
      secret: config.secret,
      accessTokenExpiry: config.accessTokenExpiry || 900, // 15 minutes
      refreshTokenExpiry: config.refreshTokenExpiry || 604800, // 7 days
      issuer: config.issuer || 'flexobo',
      audience: config.audience || 'flexobo-api',
    };
  }

  /**
   * Generate access token
   */
  generateAccessToken(
    payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + this.config.accessTokenExpiry,
      jti: this.generateTokenId(),
    };

    return this.createToken(fullPayload);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: userId,
      type: 'refresh',
      iat: now,
      exp: now + this.config.refreshTokenExpiry,
      jti: this.generateTokenId(),
    };

    return this.createToken(payload);
  }

  /**
   * Validate and decode token
   */
  validateToken(token: string): TokenValidationResult {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Verify signature
      const expectedSignature = this.createSignature(
        `${headerB64}.${payloadB64}`
      );
      if (signatureB64 !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
      }

      // Decode payload
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8')
      ) as JwtPayload;

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Verify token and return payload or throw
   */
  verifyToken(token: string): JwtPayload {
    const result = this.validateToken(token);
    if (!result.valid || !result.payload) {
      throw new UnauthorizedException(result.error || 'Invalid token');
    }
    return result.payload;
  }

  /**
   * Create JWT token
   */
  private createToken(payload: unknown): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString(
      'base64url'
    );

    const signature = this.createSignature(`${headerB64}.${payloadB64}`);

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Create HMAC signature
   */
  private createSignature(data: string): string {
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(data)
      .digest('base64url');
  }

  /**
   * Generate unique token ID
   */
  private generateTokenId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
