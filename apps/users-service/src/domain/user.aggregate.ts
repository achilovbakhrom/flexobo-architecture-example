import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { AuthPlatform, UserRole, UserStatus, UserType } from '../ports';
import {
  UserEvent,
  UserEventType,
  UserRegisteredEvent,
  UserProfileUpdatedEvent,
  UserPasswordChangedEvent,
  UserPasswordResetEvent,
  UserTelegramLinkedEvent,
} from '../ports/user.events';
import { v4 as uuid } from 'uuid';

export class User extends AggregateRoot {
  uniqueId?: string;
  email?: string;
  phoneNumber?: string;
  telegramId?: string;
  private passwordHash?: string;
  private fio?: string;
  private avatar?: string;
  role?: UserRole;
  private userType?: UserType;
  status?: UserStatus = UserStatus.ACTIVE;
  private language?: string;
  private isPrivacyPolicyAccepted?: boolean;
  private isSubscribedNewsletter?: boolean;
  private platform?: AuthPlatform | null;
  private isVerified?: boolean;
  private lastLoginAt?: Date | null;
  private isLoggedIn = false;

  get roleSafe(): UserRole {
    return this.role || UserRole.USER;
  }

  get loginSafe(): string {
    return this.email || this.phoneNumber || this.uniqueId || '';
  }

  get passwordHashSafe(): string {
    return this.passwordHash || '';
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  get telegramIdSafe(): string | undefined {
    return this.telegramId;
  }

  static create(): User {
    const id = uuid();

    return new User(id);
  }

  static fromEvents(events: DomainEvent[]): User {
    const user = new User(events[0].aggregateId);
    user.loadFromHistory(events);
    return user;
  }

  private generateUniqueId(): string {
    return `user_${uuid()}`;
  }

  register(data: UserRegisteredEvent['data']): void {
    const event = this.createEvent(UserEventType.Registered, data);

    this.addEvent(event);
    this.apply(event);
  }

  login(): void {
    const event = this.createEvent(UserEventType.LoggedIn, {
      loginAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  logout(): void {
    const event = this.createEvent(UserEventType.LoggedOut, {
      logoutAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  updateProfile(data: Omit<UserProfileUpdatedEvent['data'], 'updatedAt'>): void {
    const event = this.createEvent(UserEventType.ProfileUpdated, {
      ...data,
      updatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  changePassword(passwordHash: string): void {
    const event = this.createEvent(UserEventType.PasswordChanged, {
      passwordHash,
      changedAt: new Date(),
    } as UserPasswordChangedEvent['data']);
    this.addEvent(event);
    this.apply(event);
  }

  resetPassword(passwordHash: string): void {
    const event = this.createEvent(UserEventType.PasswordReset, {
      passwordHash,
      resetAt: new Date(),
    } as UserPasswordResetEvent['data']);
    this.addEvent(event);
    this.apply(event);
  }

  linkTelegram(telegramId: string): void {
    const event = this.createEvent(UserEventType.TelegramLinked, {
      telegramId,
      linkedAt: new Date(),
    } as UserTelegramLinkedEvent['data']);
    this.addEvent(event);
    this.apply(event);
  }

  activate(): void {
    const event = this.createEvent(UserEventType.Activated, {
      activatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  deactivate(reason?: string): void {
    const event = this.createEvent(UserEventType.Deactivated, {
      deactivatedAt: new Date(),
      reason,
    });
    this.addEvent(event);
    this.apply(event);
  }

  protected apply(event: DomainEvent<UserEvent>): void {
    switch (event.type) {
      case UserEventType.Registered:
        this.uniqueId = this.generateUniqueId();
        this.fio = event.data.fio;
        this.phoneNumber = event.data.phoneNumber;
        this.telegramId = event.data.telegramId;
        this.email = event.data.email;
        this.isPrivacyPolicyAccepted = event.data.isPrivacyPolicyAccepted;
        this.isSubscribedNewsletter = event.data.isSubscribedNewsletter;
        this.platform = event.data.platform;
        this.userType = event.data.userType;
        this.uniqueId = event.data.uniqueId;
        this.passwordHash = event.data.passwordHash;
        this.status = UserStatus.ACTIVE;
        this.isVerified = false;
        this.role = UserRole.USER;
        break;
      case UserEventType.LoggedIn:
        this.lastLoginAt = event.data.loginAt;
        this.isLoggedIn = true;
        break;
      case UserEventType.LoggedOut:
        this.isLoggedIn = false;
        break;
      case UserEventType.ProfileUpdated:
        if (event.data.fio !== undefined) this.fio = event.data.fio;
        if (event.data.phoneNumber !== undefined) this.phoneNumber = event.data.phoneNumber;
        if (event.data.language !== undefined) this.language = event.data.language;
        if (event.data.avatar !== undefined) this.avatar = event.data.avatar;
        break;
      case UserEventType.PasswordChanged:
      case UserEventType.PasswordReset:
        this.passwordHash = event.data.passwordHash;
        break;
      case UserEventType.TelegramLinked:
        this.telegramId = event.data.telegramId;
        break;
      case UserEventType.Activated:
        this.status = UserStatus.ACTIVE;
        break;
      case UserEventType.Deactivated:
        this.status = UserStatus.INACTIVE;
        break;
      default:
        // No default action
        break;
    }
  }

  static fromSnapshot(
    snapshotData: {
      id: string;
      uniqueId?: string;
      email?: string;
      phoneNumber?: string;
      telegramId?: string;
      passwordHash?: string;
      fio?: string;
      avatar?: string;
      role?: UserRole;
      userType?: UserType;
      status?: UserStatus;
      language?: string;
      isPrivacyPolicyAccepted?: boolean;
      isSubscribedNewsletter?: boolean;
      platform?: AuthPlatform | null;
      isVerified?: boolean;
      lastLoginAt?: Date | null;
    },
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): User {
    const user = new User(snapshotData.id);

    // Restore state from snapshot
    user.uniqueId = snapshotData.uniqueId;
    user.email = snapshotData.email;
    user.phoneNumber = snapshotData.phoneNumber;
    user.telegramId = snapshotData.telegramId;
    user.passwordHash = snapshotData.passwordHash;
    user.fio = snapshotData.fio;
    user.avatar = snapshotData.avatar;
    user.role = snapshotData.role;
    user.userType = snapshotData.userType;
    user.status = snapshotData.status;
    user.language = snapshotData.language;
    user.isPrivacyPolicyAccepted = snapshotData.isPrivacyPolicyAccepted;
    user.isSubscribedNewsletter = snapshotData.isSubscribedNewsletter;
    user.platform = snapshotData.platform;
    user.isVerified = snapshotData.isVerified;
    user.lastLoginAt = snapshotData.lastLoginAt;
    user._version = snapshotVersion;

    // Apply any events that occurred after the snapshot
    if (subsequentEvents.length > 0) {
      user.loadFromHistory(subsequentEvents);
    }

    return user;
  }
}
