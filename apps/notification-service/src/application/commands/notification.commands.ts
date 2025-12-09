import { ICommand } from '@flexobo/core';
import {
  NotificationType,
  NotificationCategory,
  NotificationChannel,
  NotificationSeverity,
} from '../../domain/constants/enums';

export class SendNotificationCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly userIds: string[],
    public readonly type: NotificationType,
    public readonly category: NotificationCategory,
    public readonly title: string,
    public readonly body: string,
    public readonly channels: NotificationChannel[],
    public readonly data?: Record<string, unknown>,
    public readonly severity: NotificationSeverity = NotificationSeverity.Info
  ) {}
}

export class BroadcastNotificationCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly type: NotificationType,
    public readonly category: NotificationCategory,
    public readonly title: string,
    public readonly body: string,
    public readonly channels: NotificationChannel[],
    public readonly data?: Record<string, unknown>,
    public readonly severity: NotificationSeverity = NotificationSeverity.Info
  ) {}
}

export class MarkNotificationReadCommand implements ICommand {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string
  ) {}
}

export class MarkAllNotificationsReadCommand implements ICommand {
  constructor(public readonly userId: string) {}
}

export class RegisterDeviceTokenCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly token: string,
    public readonly platform: 'IOS' | 'ANDROID' | 'WEB'
  ) {}
}

export class RemoveDeviceTokenCommand implements ICommand {
  constructor(public readonly token: string) {}
}
