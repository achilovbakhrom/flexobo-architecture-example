import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  AuthPlatform,
  UserRole,
  UserStatus,
  UserType,
  AuthMethod,
} from '../ports';
import {
  UserEvent,
  UserEventType,
  UserRegisteredEvent,
  UserProfileUpdatedEvent,
  UserPasswordChangedEvent,
  UserPasswordResetEvent,
  UserTelegramLinkedEvent,
  UserGoogleLinkedEvent,
  UserOTPRequestedEvent,
  UserAccessTokenRevokedEvent,
  OTPStatus,
  AccessTokenStatus,
} from '../ports/user.events';
import { v4 as uuid } from 'uuid';

// ============================================================
// OTP State Interface
// ============================================================

export interface UserOTPState {
  code: number;
  codeHash: string;
  authMethod: AuthMethod;
  phoneNumber?: string;
  email?: string;
  status: OTPStatus;
  expiresAt: Date;
  requestedAt: Date;
  usedAt?: Date;
}

// ============================================================
// Access Token State Interface
// ============================================================

export interface AccessTokenState {
  jti: string;
  status: AccessTokenStatus;
  issuedAt: Date;
  revokedAt?: Date;
  revokeReason?: string;
}

// ============================================================
// OTP Request Data
// ============================================================

export interface RequestOTPData {
  code: number;
  codeHash: string;
  authMethod: AuthMethod;
  phoneNumber?: string;
  email?: string;
  expiresAt: Date;
}

// ============================================================
// User Aggregate
// ============================================================

export class User extends AggregateRoot {
  // Private properties with _ prefix
  private _uniqueId?: string;
  private _email?: string;
  private _phoneNumber?: string;
  private _telegramId?: string;
  private _googleId?: string;
  private _passwordHash?: string;
  private _fio?: string;
  private _avatar?: string;
  private _role?: UserRole;
  private _userType?: UserType;
  private _status?: UserStatus = UserStatus.Active;
  private _language?: string;
  private _isPrivacyPolicyAccepted?: boolean;
  private _isSubscribedNewsletter?: boolean;
  private _platform?: AuthPlatform | null;
  private _isVerified?: boolean;
  private _lastLoginAt?: Date | null;
  private _isLoggedIn = false;

  // OTP State - latest OTP for this user
  private _currentOTP?: UserOTPState;

  // Access Tokens - Map of jti -> AccessTokenState
  private _accessTokens: Map<string, AccessTokenState> = new Map();

  // ============================================================
  // Getters - Basic User Info
  // ============================================================

  get uniqueId(): string | undefined {
    return this._uniqueId;
  }

  get email(): string | undefined {
    return this._email;
  }

  get phoneNumber(): string | undefined {
    return this._phoneNumber;
  }

  get telegramId(): string | undefined {
    return this._telegramId;
  }

  get googleId(): string | undefined {
    return this._googleId;
  }

  get passwordHash(): string {
    return this._passwordHash || '';
  }

  get fio(): string | undefined {
    return this._fio;
  }

  get avatar(): string | undefined {
    return this._avatar;
  }

  get role(): UserRole {
    return this._role || UserRole.User;
  }

  get userType(): UserType | undefined {
    return this._userType;
  }

  get status(): UserStatus {
    return this._status || UserStatus.Active;
  }

  get language(): string | undefined {
    return this._language;
  }

  get isPrivacyPolicyAccepted(): boolean {
    return this._isPrivacyPolicyAccepted || false;
  }

  get isSubscribedNewsletter(): boolean {
    return this._isSubscribedNewsletter || false;
  }

  get platform(): AuthPlatform | null | undefined {
    return this._platform;
  }

  get isVerified(): boolean {
    return this._isVerified || false;
  }

  get lastLoginAt(): Date | null | undefined {
    return this._lastLoginAt;
  }

  get isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  // ============================================================
  // Getters - Computed/Safe Values
  // ============================================================

  get loginIdentifier(): string {
    return this._email || this._phoneNumber || this._uniqueId || '';
  }

  get isActive(): boolean {
    return this._status === UserStatus.Active;
  }

  // ============================================================
  // Getters - OTP
  // ============================================================

  get currentOTP(): UserOTPState | undefined {
    return this._currentOTP;
  }

  get hasValidOTP(): boolean {
    if (!this._currentOTP) return false;
    if (this._currentOTP.status === OTPStatus.Used) return false;
    return new Date() < this._currentOTP.expiresAt;
  }

  // ============================================================
  // Getters - Access Tokens
  // ============================================================

  get accessTokens(): Map<string, AccessTokenState> {
    return new Map(this._accessTokens);
  }

  isAccessTokenActive(jti: string): boolean {
    const token = this._accessTokens.get(jti);
    return token?.status === AccessTokenStatus.Active;
  }

  // ============================================================
  // Factory Methods
  // ============================================================

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

  // ============================================================
  // Commands - User Profile
  // ============================================================

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

  updateProfile(
    data: Omit<UserProfileUpdatedEvent['data'], 'updatedAt'>
  ): void {
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

  linkGoogle(googleId: string): void {
    const event = this.createEvent(UserEventType.GoogleLinked, {
      googleId,
      linkedAt: new Date(),
    } as UserGoogleLinkedEvent['data']);
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

  // ============================================================
  // Commands - OTP
  // ============================================================

  requestOTP(data: RequestOTPData): void {
    const event = this.createEvent(UserEventType.OTPRequested, {
      code: data.code,
      codeHash: data.codeHash,
      authMethod: data.authMethod,
      phoneNumber: data.phoneNumber,
      email: data.email,
      expiresAt: data.expiresAt,
      requestedAt: new Date(),
    } as UserOTPRequestedEvent['data']);
    this.addEvent(event);
    this.apply(event);
  }

  useOTP(codeHash: string): void {
    if (!this._currentOTP) {
      throw new Error('No OTP requested');
    }
    if (this._currentOTP.codeHash !== codeHash) {
      throw new Error('Invalid OTP code hash');
    }
    // if (this._currentOTP.status === OTPStatus.Used) {
    //   throw new Error('OTP already used');
    // }
    if (new Date() > this._currentOTP.expiresAt) {
      throw new Error('OTP expired');
    }

    const event = this.createEvent(UserEventType.OTPUsed, {
      codeHash,
      usedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  // ============================================================
  // Commands - Access Tokens
  // ============================================================

  issueAccessToken(jti: string): void {
    const event = this.createEvent(UserEventType.AccessTokenIssued, {
      jti,
      issuedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  revokeAccessToken(jti: string, reason?: string): void {
    const token = this._accessTokens.get(jti);
    if (!token) {
      throw new Error('Access token not found');
    }
    if (token.status === AccessTokenStatus.Revoked) {
      throw new Error('Access token already revoked');
    }

    const event = this.createEvent(UserEventType.AccessTokenRevoked, {
      jti,
      revokedAt: new Date(),
      reason,
    } as UserAccessTokenRevokedEvent['data']);
    this.addEvent(event);
    this.apply(event);
  }

  revokeAllAccessTokens(reason?: string): void {
    for (const [jti, token] of this._accessTokens) {
      if (token.status === AccessTokenStatus.Active) {
        this.revokeAccessToken(jti, reason);
      }
    }
  }

  // ============================================================
  // Event Application
  // ============================================================

  protected apply(event: DomainEvent<UserEvent>): void {
    switch (event.type) {
      case UserEventType.Registered:
        this._uniqueId = this.generateUniqueId();
        this._fio = event.data.fio;
        this._phoneNumber = event.data.phoneNumber;
        this._telegramId = event.data.telegramId;
        this._googleId = event.data.googleId;
        this._email = event.data.email;
        this._isPrivacyPolicyAccepted = event.data.isPrivacyPolicyAccepted;
        this._isSubscribedNewsletter = event.data.isSubscribedNewsletter;
        this._platform = event.data.platform;
        this._userType = event.data.userType;
        this._uniqueId = event.data.uniqueId;
        this._passwordHash = event.data.passwordHash;
        this._status = UserStatus.Active;
        this._isVerified = false;
        this._role = UserRole.User;
        break;

      case UserEventType.LoggedIn:
        this._lastLoginAt = event.data.loginAt;
        this._isLoggedIn = true;
        break;

      case UserEventType.LoggedOut:
        this._isLoggedIn = false;
        break;

      case UserEventType.ProfileUpdated:
        if (event.data.fio !== undefined) this._fio = event.data.fio;
        if (event.data.phoneNumber !== undefined)
          this._phoneNumber = event.data.phoneNumber;
        if (event.data.language !== undefined)
          this._language = event.data.language;
        if (event.data.avatar !== undefined) this._avatar = event.data.avatar;
        break;

      case UserEventType.PasswordChanged:
      case UserEventType.PasswordReset:
        this._passwordHash = event.data.passwordHash;
        break;

      case UserEventType.TelegramLinked:
        this._telegramId = event.data.telegramId;
        break;

      case UserEventType.GoogleLinked:
        this._googleId = event.data.googleId;
        break;

      case UserEventType.Activated:
        this._status = UserStatus.Active;
        break;

      case UserEventType.Deactivated:
        this._status = UserStatus.Inactive;
        break;

      // OTP Events
      case UserEventType.OTPRequested:
        this._currentOTP = {
          code: event.data.code,
          codeHash: event.data.codeHash,
          authMethod: event.data.authMethod,
          phoneNumber: event.data.phoneNumber,
          email: event.data.email,
          status: OTPStatus.Requested,
          expiresAt: new Date(event.data.expiresAt),
          requestedAt: new Date(event.data.requestedAt),
        };
        break;

      case UserEventType.OTPUsed:
        if (
          this._currentOTP &&
          this._currentOTP.codeHash === event.data.codeHash
        ) {
          this._currentOTP.status = OTPStatus.Used;
          this._currentOTP.usedAt = new Date(event.data.usedAt);
        }
        // Mark user as verified when OTP is successfully used
        this._isVerified = true;
        break;

      // Access Token Events
      case UserEventType.AccessTokenIssued:
        this._accessTokens.set(event.data.jti, {
          jti: event.data.jti,
          status: AccessTokenStatus.Active,
          issuedAt: new Date(event.data.issuedAt),
        });
        break;

      case UserEventType.AccessTokenRevoked:
        // eslint-disable-next-line no-case-declarations
        const token = this._accessTokens.get(event.data.jti);

        if (token) {
          token.status = AccessTokenStatus.Revoked;
          token.revokedAt = new Date(event.data.revokedAt);
          token.revokeReason = event.data.reason;
        }
        break;

      default:
        // No default action
        break;
    }
  }

  // ============================================================
  // Snapshot Support
  // ============================================================

  static fromSnapshot(
    snapshotData: {
      // Support both underscore-prefixed (from JSON.stringify) and non-prefixed property names
      _id?: string;
      id?: string;
      _uniqueId?: string;
      uniqueId?: string;
      _email?: string;
      email?: string;
      _phoneNumber?: string;
      phoneNumber?: string;
      _telegramId?: string;
      telegramId?: string;
      _googleId?: string;
      googleId?: string;
      _passwordHash?: string;
      passwordHash?: string;
      _fio?: string;
      fio?: string;
      _avatar?: string;
      avatar?: string;
      _role?: UserRole;
      role?: UserRole;
      _userType?: UserType;
      userType?: UserType;
      _status?: UserStatus;
      status?: UserStatus;
      _language?: string;
      language?: string;
      _isPrivacyPolicyAccepted?: boolean;
      isPrivacyPolicyAccepted?: boolean;
      _isSubscribedNewsletter?: boolean;
      isSubscribedNewsletter?: boolean;
      _platform?: AuthPlatform | null;
      platform?: AuthPlatform | null;
      _isVerified?: boolean;
      isVerified?: boolean;
      _lastLoginAt?: Date | null;
      lastLoginAt?: Date | null;
      _currentOTP?: UserOTPState;
      currentOTP?: UserOTPState;
      _accessTokens?: Map<string, AccessTokenState> | Array<[string, AccessTokenState]>;
      accessTokens?: Array<[string, AccessTokenState]>;
    },
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): User {
    // Support both underscore-prefixed and non-prefixed property names
    const id = snapshotData._id ?? snapshotData.id;
    if (!id) {
      throw new Error('Snapshot data must contain an id');
    }
    const user = new User(id);

    // Restore basic state from snapshot (prefer underscore-prefixed from JSON.stringify)
    user._uniqueId = snapshotData._uniqueId ?? snapshotData.uniqueId;
    user._email = snapshotData._email ?? snapshotData.email;
    user._phoneNumber = snapshotData._phoneNumber ?? snapshotData.phoneNumber;
    user._telegramId = snapshotData._telegramId ?? snapshotData.telegramId;
    user._googleId = snapshotData._googleId ?? snapshotData.googleId;
    user._passwordHash = snapshotData._passwordHash ?? snapshotData.passwordHash;
    user._fio = snapshotData._fio ?? snapshotData.fio;
    user._avatar = snapshotData._avatar ?? snapshotData.avatar;
    user._role = snapshotData._role ?? snapshotData.role;
    user._userType = snapshotData._userType ?? snapshotData.userType;
    user._status = snapshotData._status ?? snapshotData.status;
    user._language = snapshotData._language ?? snapshotData.language;
    user._isPrivacyPolicyAccepted = snapshotData._isPrivacyPolicyAccepted ?? snapshotData.isPrivacyPolicyAccepted;
    user._isSubscribedNewsletter = snapshotData._isSubscribedNewsletter ?? snapshotData.isSubscribedNewsletter;
    user._platform = snapshotData._platform ?? snapshotData.platform;
    user._isVerified = snapshotData._isVerified ?? snapshotData.isVerified;
    user._lastLoginAt = snapshotData._lastLoginAt ?? snapshotData.lastLoginAt;

    // Restore OTP state
    const otpData = snapshotData._currentOTP ?? snapshotData.currentOTP;
    if (otpData) {
      user._currentOTP = {
        ...otpData,
        expiresAt: new Date(otpData.expiresAt),
        requestedAt: new Date(otpData.requestedAt),
        usedAt: otpData.usedAt ? new Date(otpData.usedAt) : undefined,
      };
    }

    // Restore access tokens (handle both Map and Array formats)
    const tokensData = snapshotData._accessTokens ?? snapshotData.accessTokens;
    if (tokensData) {
      // If it's a Map (from JSON.stringify, it becomes an object), convert entries
      let entries: Array<[string, AccessTokenState]>;
      if (tokensData instanceof Map) {
        entries = Array.from(tokensData.entries());
      } else if (Array.isArray(tokensData)) {
        entries = tokensData;
      } else {
        // Object format from JSON.stringify of Map
        entries = Object.entries(tokensData as Record<string, AccessTokenState>);
      }

      user._accessTokens = new Map(
        entries.map(([jti, token]) => [
          jti,
          {
            ...token,
            issuedAt: new Date(token.issuedAt),
            revokedAt: token.revokedAt ? new Date(token.revokedAt) : undefined,
          },
        ])
      );
    }

    user._version = snapshotVersion;

    // Apply any events that occurred after the snapshot
    if (subsequentEvents.length > 0) {
      user.loadFromHistory(subsequentEvents);
    }

    return user;
  }
}
