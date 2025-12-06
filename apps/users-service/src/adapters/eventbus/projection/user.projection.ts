import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
  BaseProjection,
  ProjectionConfig,
  EventPayload,
  IEventBuffer,
  EVENT_BUFFER,
} from '@flexobo/core';
import {
  IUserReadModelRepository,
  USER_READ_MODEL_REPOSITORY,
  UserReadModelDto,
  UserStatus,
  UserRole,
} from '../../../ports';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../../domain/events/event.constants';

interface UserRegisteredData {
  uniqueId: string;
  email?: string | null;
  phoneNumber?: string | null;
  telegramId?: string | null;
  googleId?: string | null;
  passwordHash: string;
  fio: string;
  userType?: string | null;
  isPrivacyPolicyAccepted?: boolean;
  isSubscribedNewsletter?: boolean;
  platform?: string | null;
}

interface UserLoggedInData {
  loginAt: Date;
}

interface UserProfileUpdatedData {
  fio?: string;
  phoneNumber?: string;
  language?: string;
  avatar?: string;
}

interface UserPasswordChangedData {
  passwordHash: string;
}

interface UserTelegramLinkedData {
  telegramId: string;
}

interface UserGoogleLinkedData {
  googleId: string;
}

interface UserActivatedData {
  activatedAt: Date;
}

interface UserDeactivatedData {
  deactivatedAt: Date;
}

interface UserOTPUsedData {
  otpId: string;
}

// Events that only update version, no other data
interface VersionOnlyData {
  [key: string]: unknown;
}

// Union type for all user event data
type UserEventData =
  | UserRegisteredData
  | UserLoggedInData
  | UserProfileUpdatedData
  | UserPasswordChangedData
  | UserTelegramLinkedData
  | UserGoogleLinkedData
  | UserActivatedData
  | UserDeactivatedData
  | UserOTPUsedData
  | VersionOnlyData;

// Typed event payload
type UserEventPayload = EventPayload<UserEventData>;

@Injectable()
export class UserProjection extends BaseProjection<
  UserReadModelDto,
  UserEventPayload
> {
  constructor(
    @Inject(USER_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IUserReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null
  ) {
    super(rabbitMQConsumer, UserProjection.name, eventBuffer);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: QUEUES.USER.PROJECTION,
      routingKeys: [ROUTING_KEYS.USER.ALL],
      durable: true,
      prefetchCount: 10,
      maxRetries: 10,
      lockTtlMs: 5000,
    };
  }

  /**
   * Get current version of read model from database (for buffered mode)
   */
  protected override async getCurrentModelVersion(
    aggregateId: string
  ): Promise<number> {
    const entity = await this.readModelRepository.findById(aggregateId);
    return entity?.version ?? 0;
  }

  /**
   * Apply an event to the read model (for buffered mode)
   */
  protected override async applyEvent(event: UserEventPayload): Promise<void> {
    switch (event.type) {
      case EVENT_TYPES.USER.REGISTERED:
        await this.onUserRegistered(
          event as EventPayload<UserRegisteredData>
        );
        break;

      case EVENT_TYPES.USER.LOGGED_IN:
        await this.onUserLoggedIn(event as EventPayload<UserLoggedInData>);
        break;

      case EVENT_TYPES.USER.LOGGED_OUT:
        await this.onVersionOnlyUpdate(event);
        break;

      case EVENT_TYPES.USER.PROFILE_UPDATED:
        await this.onUserProfileUpdated(
          event as EventPayload<UserProfileUpdatedData>
        );
        break;

      case EVENT_TYPES.USER.PASSWORD_CHANGED:
      case EVENT_TYPES.USER.PASSWORD_RESET:
        await this.onUserPasswordChanged(
          event as EventPayload<UserPasswordChangedData>
        );
        break;

      case EVENT_TYPES.USER.TELEGRAM_LINKED:
        await this.onUserTelegramLinked(
          event as EventPayload<UserTelegramLinkedData>
        );
        break;

      case EVENT_TYPES.USER.GOOGLE_LINKED:
        await this.onUserGoogleLinked(
          event as EventPayload<UserGoogleLinkedData>
        );
        break;

      case EVENT_TYPES.USER.ACTIVATED:
        await this.onUserActivated(event as EventPayload<UserActivatedData>);
        break;

      case EVENT_TYPES.USER.DEACTIVATED:
        await this.onUserDeactivated(
          event as EventPayload<UserDeactivatedData>
        );
        break;

      case EVENT_TYPES.USER.OTP_USED:
        await this.onUserOTPUsed(event as EventPayload<UserOTPUsedData>);
        break;

      case EVENT_TYPES.USER.OTP_REQUESTED:
      case EVENT_TYPES.USER.ACCESS_TOKEN_ISSUED:
      case EVENT_TYPES.USER.ACCESS_TOKEN_REVOKED:
        await this.onVersionOnlyUpdate(event);
        break;

      default:
        this.logger.warn(`Unknown user event type: ${event.type}`);
    }
  }

  /**
   * Handle an event (for non-buffered mode, delegates to applyEvent)
   */
  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as UserEventPayload;
    await this.applyEvent(payload);
  }

  private async onUserRegistered(
    event: EventPayload<UserRegisteredData>
  ): Promise<void> {
    const existingUser = await this.readModelRepository.findById(
      event.aggregateId
    );
    this.checkCreateIdempotency(existingUser, event);

    const { data } = event;
    await this.readModelRepository.upsert(
      {
        id: event.aggregateId,
        uniqueId: data.uniqueId,
        email: data.email,
        phoneNumber: data.phoneNumber,
        telegramId: data.telegramId,
        googleId: data.googleId,
        passwordHash: data.passwordHash,
        fio: data.fio,
        avatar: null,
        role: UserRole.User,
        userType: data.userType as any,
        status: UserStatus.Active,
        language: 'en',
        isPrivacyPolicyAccepted: data.isPrivacyPolicyAccepted ?? false,
        isSubscribedNewsletter: data.isSubscribedNewsletter ?? false,
        platform: data.platform as any,
        isVerified: false,
        lastLoginAt: null,
        updatedAt: new Date(),
      },
      { version: event.version }
    );
  }

  private async onUserLoggedIn(
    event: EventPayload<UserLoggedInData>
  ): Promise<void> {
    const existingUser = await this.readModelRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingUser, event);

    await this.readModelRepository.updateLastLogin(
      event.aggregateId,
      event.version
    );
  }

  private async onUserProfileUpdated(
    event: EventPayload<UserProfileUpdatedData>
  ): Promise<void> {
    const existingUser = await this.readModelRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingUser, event);

    const { data } = event;
    await this.readModelRepository.updateProfile(
      event.aggregateId,
      {
        fio: data.fio,
        phoneNumber: data.phoneNumber,
        language: data.language,
        avatar: data.avatar,
      },
      event.version
    );
  }

  private async onUserPasswordChanged(
    event: EventPayload<UserPasswordChangedData>
  ): Promise<void> {
    const existingUser = await this.readModelRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingUser, event);

    await this.readModelRepository.updatePassword(
      event.aggregateId,
      event.data.passwordHash,
      event.version
    );
  }

  private async onUserTelegramLinked(
    event: EventPayload<UserTelegramLinkedData>
  ): Promise<void> {
    const existingUser = await this.readModelRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingUser, event);

    await this.readModelRepository.updateTelegramId(
      event.aggregateId,
      event.data.telegramId,
      event.version
    );
  }

  private async onUserGoogleLinked(
    event: EventPayload<UserGoogleLinkedData>
  ): Promise<void> {
    const existingUser = await this.readModelRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingUser, event);

    await this.readModelRepository.updateGoogleId(
      event.aggregateId,
      event.data.googleId,
      event.version
    );
  }

  private async onUserActivated(
    event: EventPayload<UserActivatedData>
  ): Promise<void> {
    const existingUser = await this.readModelRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingUser, event);

    await this.readModelRepository.updateStatus(
      event.aggregateId,
      UserStatus.Active,
      event.version
    );
  }

  private async onUserDeactivated(
    event: EventPayload<UserDeactivatedData>
  ): Promise<void> {
    const existingUser = await this.readModelRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingUser, event);

    await this.readModelRepository.updateStatus(
      event.aggregateId,
      UserStatus.Inactive,
      event.version
    );
  }

  private async onUserOTPUsed(
    event: EventPayload<UserOTPUsedData>
  ): Promise<void> {
    const existingUser = await this.readModelRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingUser, event);

    await this.readModelRepository.updateIsVerified(
      event.aggregateId,
      true,
      event.version
    );
  }

  /**
   * Updates only the version for events that don't change other read model data.
   * This ensures version tracking stays in sync with the aggregate.
   */
  private async onVersionOnlyUpdate(event: UserEventPayload): Promise<void> {
    const existingUser = await this.readModelRepository.findById(
      event.aggregateId
    );
    this.checkVersion(existingUser, event);

    await this.readModelRepository.updateVersion(
      event.aggregateId,
      event.version
    );
  }
}
