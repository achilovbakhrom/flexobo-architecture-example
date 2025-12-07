import { Injectable } from '@nestjs/common';
import {
  INotificationResolver,
  NotificationIntent,
  NotificationTarget,
  NotificationChannel,
  NotificationType,
  NotificationCategory,
  NotificationSeverity,
  EventPayload,
} from '@flexobo/core';
import { EVENT_TYPES } from '@flexobo/shared-kernel';

type UserEventPayload = EventPayload<Record<string, unknown>>;

export const USER_NOTIFICATION_RESOLVER = Symbol('USER_NOTIFICATION_RESOLVER');

@Injectable()
export class UserNotificationResolver
  implements INotificationResolver<UserEventPayload>
{
  resolve(event: UserEventPayload): NotificationIntent | null {
    switch (event.type) {
      case EVENT_TYPES.USER.REGISTERED:
        return this.onUserRegistered(event);
      case EVENT_TYPES.USER.ACTIVATED:
        return this.onUserActivated(event);
      case EVENT_TYPES.USER.DEACTIVATED:
        return this.onUserDeactivated(event);
      case EVENT_TYPES.USER.PASSWORD_CHANGED:
      case EVENT_TYPES.USER.PASSWORD_RESET:
        return this.onPasswordChanged(event);
      case EVENT_TYPES.USER.TELEGRAM_LINKED:
        return this.onTelegramLinked(event);
      case EVENT_TYPES.USER.GOOGLE_LINKED:
        return this.onGoogleLinked(event);
      case EVENT_TYPES.USER.PROFILE_UPDATED:
      case EVENT_TYPES.USER.LOGGED_IN:
      case EVENT_TYPES.USER.LOGGED_OUT:
      case EVENT_TYPES.USER.OTP_REQUESTED:
      case EVENT_TYPES.USER.OTP_USED:
      case EVENT_TYPES.USER.ACCESS_TOKEN_ISSUED:
      case EVENT_TYPES.USER.ACCESS_TOKEN_REVOKED:
        return null;
      default:
        return null;
    }
  }

  private onUserRegistered(event: UserEventPayload): NotificationIntent {
    return {
      target: NotificationTarget.User,
      userIds: [event.aggregateId],
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Success,
        title: 'Welcome to Flexobo!',
        body: 'Your account has been created successfully',
        data: {
          userId: event.aggregateId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onUserActivated(event: UserEventPayload): NotificationIntent {
    return {
      target: NotificationTarget.User,
      userIds: [event.aggregateId],
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Success,
        title: 'Account Activated',
        body: 'Your account has been activated',
        data: {
          userId: event.aggregateId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onUserDeactivated(event: UserEventPayload): NotificationIntent {
    return {
      target: NotificationTarget.User,
      userIds: [event.aggregateId],
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Warning,
        title: 'Account Deactivated',
        body: 'Your account has been deactivated',
        data: {
          userId: event.aggregateId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onPasswordChanged(event: UserEventPayload): NotificationIntent {
    return {
      target: NotificationTarget.User,
      userIds: [event.aggregateId],
      channels: [NotificationChannel.Sse, NotificationChannel.Email],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Info,
        title: 'Password Changed',
        body: 'Your password has been changed successfully',
        data: {
          userId: event.aggregateId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onTelegramLinked(event: UserEventPayload): NotificationIntent {
    return {
      target: NotificationTarget.User,
      userIds: [event.aggregateId],
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Success,
        title: 'Telegram Linked',
        body: 'Your Telegram account has been linked successfully',
        data: {
          userId: event.aggregateId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }

  private onGoogleLinked(event: UserEventPayload): NotificationIntent {
    return {
      target: NotificationTarget.User,
      userIds: [event.aggregateId],
      channels: [NotificationChannel.Sse],
      payload: {
        type: NotificationType.User,
        category: NotificationCategory.System,
        severity: NotificationSeverity.Success,
        title: 'Google Linked',
        body: 'Your Google account has been linked successfully',
        data: {
          userId: event.aggregateId,
        },
      },
      correlationId: event.metadata?.['correlationId'] as string,
    };
  }
}
