/**
 * Authentication and Authorization types
 */

/**
 * User roles for RBAC
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MANAGER = 'MANAGER',
  GUEST = 'GUEST',
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  /**
   * User ID
   */
  sub: string;

  /**
   * Username or email
   */
  username: string;

  /**
   * User roles
   */
  roles: UserRole[];

  /**
   * Issued at timestamp
   */
  iat: number;

  /**
   * Expiration timestamp
   */
  exp: number;

  /**
   * JWT ID (unique identifier)
   */
  jti?: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  /**
   * Access token (short-lived)
   */
  accessToken: string;

  /**
   * Refresh token (long-lived)
   */
  refreshToken: string;

  /**
   * Token type (usually 'Bearer')
   */
  tokenType: string;

  /**
   * Expiration time in seconds
   */
  expiresIn: number;

  /**
   * User information
   */
  user: {
    id: string;
    username: string;
    roles: UserRole[];
  };
}

/**
 * User credentials for login
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * User registration data
 */
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  roles?: UserRole[];
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  payload?: JwtPayload;
  error?: string;
}

/**
 * Permission definition
 */
export interface Permission {
  /**
   * Resource being accessed (e.g., 'orders', 'users')
   */
  resource: string;

  /**
   * Action being performed (e.g., 'read', 'write', 'delete')
   */
  action: string;
}

/**
 * Authorization policy
 */
export interface AuthorizationPolicy {
  /**
   * Policy name
   */
  name: string;

  /**
   * Required roles
   */
  roles?: UserRole[];

  /**
   * Required permissions
   */
  permissions?: Permission[];

  /**
   * Custom validation function
   */
  validate?: (user: JwtPayload, context?: unknown) => boolean;
}
