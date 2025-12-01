import { AuthPlatform, UserType } from './user.enums';

export enum UserEventType {
  Registered = 'user.registered',
  LoggedIn = 'user.logged_in',
  LoggedOut = 'user.logged_out',
  ProfileUpdated = 'user.profile_updated',
  PasswordChanged = 'user.password_changed',
}

export interface UserRegisteredEvent {
  type: UserEventType.Registered;
  data: {
    fio: string;
    phoneNumber?: string;
    telegramId?: string;
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
    userId: string;
    changes: Record<string, unknown>;
    updatedAt: Date;
  };
}

export type UserEvent =
  | UserRegisteredEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | UserProfileUpdatedEvent;
