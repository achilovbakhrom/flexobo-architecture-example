/**
 * Token Validator Interface
 *
 * This interface allows different services to validate tokens in different ways:
 * - users-service: validates locally using JWT secret and local blacklist check
 * - other services: validates via gRPC call to users-service
 */

export interface ITokenPayload {
  sub: string;
  email?: string;
  role: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface ITokenValidationResult {
  valid: boolean;
  userId?: string;
  role?: string;
  jti?: string;
  payload?: ITokenPayload;
  error?: string;
}

export interface ITokenValidator {
  /**
   * Validates a token and returns the validation result
   * @param token - The JWT token to validate
   * @returns ITokenValidationResult with payload if valid
   */
  validate(token: string): Promise<ITokenValidationResult>;
}

export const TOKEN_VALIDATOR = Symbol('TOKEN_VALIDATOR');
