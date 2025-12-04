export const ErrorCodes = {
  // Auth errors
  PHONE_EXISTS: 'PHONE_EXISTS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  TELEGRAM_EXISTS: 'TELEGRAM_EXISTS',
  GOOGLE_EXISTS: 'GOOGLE_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_ACTIVE: 'ACCOUNT_NOT_ACTIVE',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  REFRESH_TOKEN_REVOKED: 'REFRESH_TOKEN_REVOKED',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  // OTP errors
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  // Validation errors
  PHONE_REQUIRED: 'PHONE_REQUIRED',
  EMAIL_REQUIRED: 'EMAIL_REQUIRED',
  // Password errors
  INVALID_OLD_PASSWORD: 'INVALID_OLD_PASSWORD',
  PASSWORD_NOT_SET: 'PASSWORD_NOT_SET',
  // Telegram errors
  INVALID_TELEGRAM_ID: 'INVALID_TELEGRAM_ID',
  // Google errors
  INVALID_GOOGLE_TOKEN: 'INVALID_GOOGLE_TOKEN',
} as const;

export const TokenBlacklistReasons = {
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
} as const;

export const TokenConfig = {
  BLACKLIST_EXPIRY_HOURS: 1,
} as const;

export const OTPConfig = {
  EXPIRES_IN_MINUTES: 5,
} as const;

export const ErrorMessages = {
  [ErrorCodes.PHONE_EXISTS]: 'User with this phone number already exists',
  [ErrorCodes.EMAIL_EXISTS]: 'User with this email already exists',
  [ErrorCodes.TELEGRAM_EXISTS]: 'User with this Telegram ID already exists',
  [ErrorCodes.GOOGLE_EXISTS]: 'User with this Google account already exists',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCodes.ACCOUNT_NOT_ACTIVE]: 'Account is not active',
  [ErrorCodes.INVALID_REFRESH_TOKEN]: 'Invalid refresh token',
  [ErrorCodes.REFRESH_TOKEN_REVOKED]: 'Refresh token has been revoked',
  [ErrorCodes.REFRESH_TOKEN_EXPIRED]: 'Refresh token has expired',
  [ErrorCodes.USER_NOT_FOUND]: 'User not found',
  [ErrorCodes.INVALID_OTP]: 'Invalid OTP code',
  [ErrorCodes.OTP_EXPIRED]: 'OTP code has expired',
  [ErrorCodes.PHONE_REQUIRED]: 'Phone number is required',
  [ErrorCodes.EMAIL_REQUIRED]: 'Email is required',
  [ErrorCodes.INVALID_OLD_PASSWORD]: 'Current password is incorrect',
  [ErrorCodes.PASSWORD_NOT_SET]: 'Password not set for this user',
  [ErrorCodes.INVALID_TELEGRAM_ID]: 'Invalid Telegram ID',
  [ErrorCodes.INVALID_GOOGLE_TOKEN]: 'Invalid or expired Google token',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
