import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  GetNotificationsQuery,
  GetUnreadCountQuery,
  GetNotificationByIdQuery,
} from './notification.queries';
import {
  NOTIFICATION_READ_REPOSITORY,
  INotificationReadRepository,
  NotificationReadModel,
  NotificationListResult,
} from '../../ports/notification.repository';

@Injectable()
@QueryHandler(GetNotificationsQuery)
export class GetNotificationsHandler
  implements IQueryHandler<GetNotificationsQuery, NotificationListResult>
{
  constructor(
    @Inject(NOTIFICATION_READ_REPOSITORY)
    private readonly readRepository: INotificationReadRepository
  ) {}

  async execute(query: GetNotificationsQuery): Promise<NotificationListResult> {
    return this.readRepository.findByUserId(query.userId, {
      type: query.type,
      unreadOnly: query.unreadOnly,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}

@Injectable()
@QueryHandler(GetUnreadCountQuery)
export class GetUnreadCountHandler
  implements IQueryHandler<GetUnreadCountQuery, number>
{
  constructor(
    @Inject(NOTIFICATION_READ_REPOSITORY)
    private readonly readRepository: INotificationReadRepository
  ) {}

  async execute(query: GetUnreadCountQuery): Promise<number> {
    return this.readRepository.countUnreadByUserId(query.userId);
  }
}

@Injectable()
@QueryHandler(GetNotificationByIdQuery)
export class GetNotificationByIdHandler
  implements IQueryHandler<GetNotificationByIdQuery, NotificationReadModel | null>
{
  constructor(
    @Inject(NOTIFICATION_READ_REPOSITORY)
    private readonly readRepository: INotificationReadRepository
  ) {}

  async execute(query: GetNotificationByIdQuery): Promise<NotificationReadModel | null> {
    const notification = await this.readRepository.findById(query.notificationId);

    if (!notification || notification.userId !== query.userId) {
      throw new NotFoundException(
        `Notification ${query.notificationId} not found`
      );
    }

    return notification;
  }
}

export const QueryHandlers = [
  GetNotificationsHandler,
  GetUnreadCountHandler,
  GetNotificationByIdHandler,
];
