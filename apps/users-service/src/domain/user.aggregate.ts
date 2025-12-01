import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { AuthPlatform, UserRole, UserStatus, UserType } from '../ports';
import {
  UserEvent,
  UserEventType,
  UserLoggedInEvent,
  UserRegisteredEvent,
} from '../ports/user.events';
import { v4 as uuid } from 'uuid';

export class User extends AggregateRoot {
  private uniqueId?: string;
  private email?: string;
  private phoneNumber?: string;
  private telegramId?: string;
  private passwordHash?: string;
  private fio?: string;
  private avatar?: string;
  private role?: UserRole;
  private userType?: UserType;
  private status?: UserStatus;
  private language?: string;
  private isPrivacyPolicyAccepted?: boolean;
  private isSubscribedNewsletter?: boolean;
  private platform?: AuthPlatform | null;
  private isVerified?: boolean;
  private lastLoginAt?: Date | null;
  private isLoggedIn = false;

  static create(): User {
    const id = uuid();

    return new User(id);
  }

  private generateUniqueId(): string {
    return `user_${uuid()}`;
  }

  register(data: UserRegisteredEvent['data']): void {
    const event = this.createEvent(UserEventType.Registered, data);

    this.addEvent(event);
    this.apply(event);
  }

  login(data: UserLoggedInEvent['data']): void {
    const event = this.createEvent(UserEventType.LoggedIn, {
      ...data,
      loginAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  logout() {
    const event = this.createEvent(UserEventType.LoggedOut, {
      userId: this.id,
      logoutAt: new Date(),
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
        this.status = UserStatus.INACTIVE;
        this.isVerified = false;

        break;
      case UserEventType.LoggedIn:
        this.lastLoginAt = event.data.loginAt;
        this.isLoggedIn = true;
        break;
      case UserEventType.LoggedOut:
        this.isLoggedIn = false;
        break;
      case UserEventType.ProfileUpdated:
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
