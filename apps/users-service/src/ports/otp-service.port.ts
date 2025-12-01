export interface OTPCode {
  code: number;
  codeHash: string;
}

export interface IOTPService {
  generateOTP(): OTPCode;
  getExpiresAt(): Date;
}

export const OTP_SERVICE = Symbol('IOTPService');
