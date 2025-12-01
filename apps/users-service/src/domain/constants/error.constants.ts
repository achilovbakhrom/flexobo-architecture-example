export const ErrorCodes = {
  // Auth errors
  PHONE_EXISTS: 'PHONE_EXISTS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_ACTIVE: 'ACCOUNT_NOT_ACTIVE',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  REFRESH_TOKEN_REVOKED: 'REFRESH_TOKEN_REVOKED',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const;

export const TokenBlacklistReasons = {
  LOGOUT: 'logout',
} as const;

export const TokenConfig = {
  BLACKLIST_EXPIRY_HOURS: 1,
} as const;

export const ErrorMessages = {
  [ErrorCodes.PHONE_EXISTS]: 'User with this phone number already exists',
  [ErrorCodes.EMAIL_EXISTS]: 'User with this email already exists',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCodes.ACCOUNT_NOT_ACTIVE]: 'Account is not active',
  [ErrorCodes.INVALID_REFRESH_TOKEN]: 'Invalid refresh token',
  [ErrorCodes.REFRESH_TOKEN_REVOKED]: 'Refresh token has been revoked',
  [ErrorCodes.REFRESH_TOKEN_EXPIRED]: 'Refresh token has expired',
  [ErrorCodes.USER_NOT_FOUND]: 'User not found',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
