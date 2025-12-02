/**
 * Password hashing service using bcrypt-like algorithm
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PasswordService {
  private readonly SALT_ROUNDS = 10;

  /**
   * Hash a password
   */
  async hash(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await this.hashWithSalt(password, salt);
    return `${salt}:${hash}`;
  }

  /**
   * Verify password against hash
   */
  async verify(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const [salt, hash] = hashedPassword.split(':');
      if (!salt || !hash) {
        return false;
      }

      const newHash = await this.hashWithSalt(password, salt);
      return this.secureCompare(hash, newHash);
    } catch {
      return false;
    }
  }

  /**
   * Generate random password
   */
  generateRandomPassword(length = 16): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }

    return password;
  }

  /**
   * Hash password with salt using PBKDF2
   */
  private async hashWithSalt(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        100000, // iterations
        64, // key length
        'sha512',
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey.toString('hex'));
        }
      );
    });
  }

  /**
   * Timing-safe string comparison
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return crypto.timingSafeEqual(bufferA, bufferB);
  }
}
