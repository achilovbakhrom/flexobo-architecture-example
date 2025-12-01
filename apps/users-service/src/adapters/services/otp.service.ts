import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { IOTPService, OTPCode, OTPConfig } from '../../ports';

@Injectable()
export class OTPService implements IOTPService {
  private readonly otpExpiryMinutes: number;

  constructor(private readonly configService: ConfigService) {
    this.otpExpiryMinutes =
      this.configService.get<number>('OTP_EXPIRY_MINUTES') ||
      OTPConfig.EXPIRES_IN_MINUTES;
  }

  generateOTP(): OTPCode {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000);

    // Generate code hash for verification
    const codeToken = crypto.randomBytes(32).toString('hex');
    const codeHash = crypto
      .createHash('sha256')
      .update(codeToken)
      .digest('hex');

    return { code, codeHash };
  }

  getExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.otpExpiryMinutes);
    return expiresAt;
  }
}
