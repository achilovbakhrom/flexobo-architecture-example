import { AuthPlatform, UserType } from './user.enums';
import { AuthMethod } from './user.interface';

// ============================================================
// OTP Status Enum
// ============================================================

export enum OTPStatus {
  Requested = 'REQUESTED',
  Used = 'USED',
}

// ============================================================
// Access Token Status Enum
// ============================================================

export enum AccessTokenStatus {
  Active = 'ACTIVE',
  Revoked = 'REVOKED',
}

// ============================================================
// User Event Types
// ============================================================

export enum UserEventType {
  Registered = 'user.registered',
  LoggedIn = 'user.logged_in',
  LoggedOut = 'user.logged_out',
  ProfileUpdated = 'user.profile_updated',
  PasswordChanged = 'user.password_changed',
  PasswordReset = 'user.password_reset',
  TelegramLinked = 'user.telegram_linked',
  GoogleLinked = 'user.google_linked',
  Activated = 'user.activated',
  Deactivated = 'user.deactivated',
  // OTP events
  OTPRequested = 'user.otp_requested',
  OTPUsed = 'user.otp_used',
  // Access Token events
  AccessTokenIssued = 'user.access_token_issued',
  AccessTokenRevoked = 'user.access_token_revoked',
}

// ============================================================
// User Profile Events
// ============================================================

export interface UserRegisteredEvent {
  type: UserEventType.Registered;
  data: {
    fio: string;
    phoneNumber?: string;
    telegramId?: string;
    googleId?: string;
    email?: string;
    isPrivacyPolicyAccepted?: boolean;
    isSubscribedNewsletter?: boolean;
    platform?: AuthPlatform;
    userType?: UserType;
    uniqueId?: string;
    passwordHash?: string;
  };
}

export interface UserLoggedInEvent {
  type: UserEventType.LoggedIn;
  data: {
    loginAt?: Date;
  };
}

export interface UserLoggedOutEvent {
  type: UserEventType.LoggedOut;
  data: {
    logoutAt?: Date;
  };
}

export interface UserProfileUpdatedEvent {
  type: UserEventType.ProfileUpdated;
  data: {
    fio?: string;
    phoneNumber?: string;
    language?: string;
    avatar?: string;
    updatedAt: Date;
  };
}

export interface UserPasswordChangedEvent {
  type: UserEventType.PasswordChanged;
  data: {
    passwordHash: string;
    changedAt: Date;
  };
}

export interface UserPasswordResetEvent {
  type: UserEventType.PasswordReset;
  data: {
    passwordHash: string;
    resetAt: Date;
  };
}

export interface UserTelegramLinkedEvent {
  type: UserEventType.TelegramLinked;
  data: {
    telegramId: string;
    linkedAt: Date;
  };
}

export interface UserGoogleLinkedEvent {
  type: UserEventType.GoogleLinked;
  data: {
    googleId: string;
    linkedAt: Date;
  };
}

export interface UserActivatedEvent {
  type: UserEventType.Activated;
  data: {
    activatedAt: Date;
  };
}

export interface UserDeactivatedEvent {
  type: UserEventType.Deactivated;
  data: {
    deactivatedAt: Date;
    reason?: string;
  };
}

// ============================================================
// OTP Events
// ============================================================

export interface UserOTPRequestedEvent {
  type: UserEventType.OTPRequested;
  data: {
    code: number;
    codeHash: string;
    authMethod: AuthMethod;
    phoneNumber?: string;
    email?: string;
    expiresAt: Date;
    requestedAt: Date;
  };
}

export interface UserOTPUsedEvent {
  type: UserEventType.OTPUsed;
  data: {
    codeHash: string;
    usedAt: Date;
  };
}

// ============================================================
// Access Token Events
// ============================================================

export interface UserAccessTokenIssuedEvent {
  type: UserEventType.AccessTokenIssued;
  data: {
    jti: string;
    issuedAt: Date;
  };
}

export interface UserAccessTokenRevokedEvent {
  type: UserEventType.AccessTokenRevoked;
  data: {
    jti: string;
    revokedAt: Date;
    reason?: string;
  };
}

// ============================================================
// Union Type
// ============================================================

export type UserEvent =
  | UserRegisteredEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | UserProfileUpdatedEvent
  | UserPasswordChangedEvent
  | UserPasswordResetEvent
  | UserTelegramLinkedEvent
  | UserGoogleLinkedEvent
  | UserActivatedEvent
  | UserDeactivatedEvent
  | UserOTPRequestedEvent
  | UserOTPUsedEvent
  | UserAccessTokenIssuedEvent
  | UserAccessTokenRevokedEvent;
