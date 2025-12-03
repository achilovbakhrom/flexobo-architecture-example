import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
} from '@flexobo/core';
import {
  IUserReadModelRepository,
  USER_READ_MODEL_REPOSITORY,
  UserStatus,
  UserRole,
} from '../../../ports';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../../domain/events/event.constants';

interface UserEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class UserProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(USER_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: IUserReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.USER.PROJECTION);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error(
        'RabbitMQ is not connected. Cannot start user projection.'
      );
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.USER.PROJECTION,
      [ROUTING_KEYS.USER.ALL],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.USER.PROJECTION}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as UserEventPayload;

    this.logger.debug(
      `[Projection] User event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case EVENT_TYPES.USER.REGISTERED:
        await this.onUserRegistered(payload);
        break;

      case EVENT_TYPES.USER.LOGGED_IN:
        await this.onUserLoggedIn(payload);
        break;

      case EVENT_TYPES.USER.LOGGED_OUT:
        // No read model update needed for logout
        break;

      case EVENT_TYPES.USER.PROFILE_UPDATED:
        await this.onUserProfileUpdated(payload);
        break;

      case EVENT_TYPES.USER.PASSWORD_CHANGED:
      case EVENT_TYPES.USER.PASSWORD_RESET:
        await this.onUserPasswordChanged(payload);
        break;

      case EVENT_TYPES.USER.TELEGRAM_LINKED:
        await this.onUserTelegramLinked(payload);
        break;

      case EVENT_TYPES.USER.ACTIVATED:
        await this.onUserActivated(payload);
        break;

      case EVENT_TYPES.USER.DEACTIVATED:
        await this.onUserDeactivated(payload);
        break;

      default:
        this.logger.warn(`Unknown user event type: ${payload.type}`);
    }
  }

  private async onUserRegistered(event: UserEventPayload): Promise<void> {
    await this.readModelRepository.upsert(
      {
        id: event.aggregateId,
        uniqueId: event.data['uniqueId'] as string,
        email: event.data['email'] as string | null,
        phoneNumber: event.data['phoneNumber'] as string | null,
        telegramId: event.data['telegramId'] as string | null,
        passwordHash: event.data['passwordHash'] as string,
        fio: event.data['fio'] as string,
        avatar: null,
        role: UserRole.User,
        userType: event.data['userType'] as any,
        status: UserStatus.Active,
        language: 'en',
        isPrivacyPolicyAccepted:
          (event.data['isPrivacyPolicyAccepted'] as boolean) ?? false,
        isSubscribedNewsletter:
          (event.data['isSubscribedNewsletter'] as boolean) ?? false,
        platform: event.data['platform'] as any,
        isVerified: false,
        lastLoginAt: null,
        updatedAt: new Date(),
      },
      { version: event.version }
    );
  }

  private async onUserLoggedIn(event: UserEventPayload): Promise<void> {
    await this.readModelRepository.updateLastLogin(event.aggregateId);
  }

  private async onUserProfileUpdated(event: UserEventPayload): Promise<void> {
    await this.readModelRepository.updateProfile(event.aggregateId, {
      fio: event.data['fio'] as string | undefined,
      phoneNumber: event.data['phoneNumber'] as string | undefined,
      language: event.data['language'] as string | undefined,
      avatar: event.data['avatar'] as string | undefined,
    });
  }

  private async onUserPasswordChanged(event: UserEventPayload): Promise<void> {
    await this.readModelRepository.updatePassword(
      event.aggregateId,
      event.data['passwordHash'] as string
    );
  }

  private async onUserTelegramLinked(event: UserEventPayload): Promise<void> {
    await this.readModelRepository.updateTelegramId(
      event.aggregateId,
      event.data['telegramId'] as string
    );
  }

  private async onUserActivated(event: UserEventPayload): Promise<void> {
    await this.readModelRepository.updateStatus(
      event.aggregateId,
      UserStatus.Active
    );
  }

  private async onUserDeactivated(event: UserEventPayload): Promise<void> {
    await this.readModelRepository.updateStatus(
      event.aggregateId,
      UserStatus.Inactive
    );
  }
}
