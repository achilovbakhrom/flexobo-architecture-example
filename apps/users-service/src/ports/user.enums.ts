export enum UserRole {
  User = 'user',
  Admin = 'admin',
  SuperAdmin = 'superadmin',
}

export enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
  Blocked = 'blocked',
}

export enum UserType {
  Broker = 'broker',
  LoadOwner = 'load_owner',
  Carrier = 'carrier',
  CompanyDriver = 'company_driver',
  OwnerOperator = 'owner_operator',
}

export enum AuthPlatform {
  Web = 'web',
  Mobile = 'mobile',
  Telegram = 'telegram',
  Google = 'google',
}

export enum TokenType {
  Access = 'access',
  Refresh = 'refresh',
}
