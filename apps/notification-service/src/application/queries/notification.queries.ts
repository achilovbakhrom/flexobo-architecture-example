import { IQuery } from '@flexobo/core';
import { NotificationType } from '../../domain/constants/enums';

export class GetNotificationsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
    public readonly type?: NotificationType,
    public readonly unreadOnly?: boolean
  ) {}
}

export class GetUnreadCountQuery implements IQuery {
  constructor(public readonly userId: string) {}
}

export class GetNotificationByIdQuery implements IQuery {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string
  ) {}
}
