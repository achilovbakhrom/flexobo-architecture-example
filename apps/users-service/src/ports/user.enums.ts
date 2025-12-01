export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED',
}

export enum UserType {
  BROKER = 'BROKER',
  LOAD_OWNER = 'LOAD_OWNER',
  CARRIER = 'CARRIER',
  COMPANY_DRIVER = 'COMPANY_DRIVER',
  OWNER_OPERATOR = 'OWNER_OPERATOR',
}

export enum AuthPlatform {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  TELEGRAM = 'TELEGRAM',
}

export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
}
