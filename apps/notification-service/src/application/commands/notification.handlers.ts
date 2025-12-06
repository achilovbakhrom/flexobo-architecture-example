import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import {
  SendNotificationCommand,
  BroadcastNotificationCommand,
  MarkNotificationReadCommand,
  MarkAllNotificationsReadCommand,
} from './notification.commands';
import {
  NOTIFICATION_AGGREGATE_STORE,
  NOTIFICATION_READ_REPOSITORY,
  INotificationAggregateStore,
  INotificationReadRepository,
} from '../../ports/notification.repository';
import { PUSH_SERVICE, IPushService } from '../../ports/push-service.port';
import { SSE_MANAGER, ISSEManager, SSEPayload } from '../../ports/sse-service.port';
import { NotificationAggregate } from '../../domain/aggregates/notification.aggregate';
import { NotificationType, NotificationChannel } from '../../domain/constants/enums';

@Injectable()
@CommandHandler(SendNotificationCommand)
export class SendNotificationHandler implements ICommandHandler<SendNotificationCommand> {
  private readonly logger = new Logger(SendNotificationHandler.name);

  constructor(
    @Inject(NOTIFICATION_AGGREGATE_STORE)
    private readonly aggregateStore: INotificationAggregateStore,
    @Inject(PUSH_SERVICE)
    private readonly pushService: IPushService,
    @Inject(SSE_MANAGER)
    private readonly sseManager: ISSEManager
  ) {}

  async execute(command: SendNotificationCommand): Promise<void> {
    this.logger.debug(
      `Sending notification to ${command.userIds.length} users: ${command.title}`
    );

    for (const userId of command.userIds) {
      const notificationId = uuidv4();

      if (command.type === NotificationType.USER) {
        const notification = NotificationAggregate.create({
          id: notificationId,
          userId,
          type: command.type,
          category: command.category,
          title: command.title,
          body: command.body,
          data: command.data,
          channels: command.channels,
        });

        await this.aggregateStore.save(notification);
      }

      const payload: SSEPayload = {
        type: command.type,
        category: command.category,
        title: command.title,
        body: command.body,
        data: command.data,
        timestamp: Date.now(),
      };

      if (command.channels.includes(NotificationChannel.SSE)) {
        await this.sseManager.sendToUser(userId, payload);
      }
    }

    if (command.channels.includes(NotificationChannel.PUSH)) {
      await this.pushService.sendToUsers(command.userIds, {
        title: command.title,
        body: command.body,
        data: command.data as Record<string, string> | undefined,
      });
    }
  }
}

@Injectable()
@CommandHandler(BroadcastNotificationCommand)
export class BroadcastNotificationHandler
  implements ICommandHandler<BroadcastNotificationCommand>
{
  private readonly logger = new Logger(BroadcastNotificationHandler.name);

  constructor(
    @Inject(PUSH_SERVICE)
    private readonly pushService: IPushService,
    @Inject(SSE_MANAGER)
    private readonly sseManager: ISSEManager
  ) {}

  async execute(command: BroadcastNotificationCommand): Promise<void> {
    this.logger.debug(`Broadcasting notification: ${command.title}`);

    const payload: SSEPayload = {
      type: command.type,
      category: command.category,
      title: command.title,
      body: command.body,
      data: command.data,
      timestamp: Date.now(),
    };

    if (command.channels.includes(NotificationChannel.SSE)) {
      await this.sseManager.broadcast(payload);
    }

    if (command.channels.includes(NotificationChannel.PUSH)) {
      await this.pushService.sendToAll({
        title: command.title,
        body: command.body,
        data: command.data as Record<string, string> | undefined,
      });
    }
  }
}

@Injectable()
@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler
  implements ICommandHandler<MarkNotificationReadCommand>
{
  constructor(
    @Inject(NOTIFICATION_AGGREGATE_STORE)
    private readonly aggregateStore: INotificationAggregateStore,
    @Inject(NOTIFICATION_READ_REPOSITORY)
    private readonly readRepository: INotificationReadRepository
  ) {}

  async execute(command: MarkNotificationReadCommand): Promise<void> {
    const notification = await this.readRepository.findById(command.notificationId);

    if (!notification) {
      throw new NotFoundException(
        `Notification ${command.notificationId} not found`
      );
    }

    if (notification.userId !== command.userId) {
      throw new NotFoundException(
        `Notification ${command.notificationId} not found`
      );
    }

    if (notification.isRead) {
      return;
    }

    const aggregate = await this.aggregateStore.load(command.notificationId);
    if (!aggregate) {
      throw new NotFoundException(
        `Notification ${command.notificationId} not found`
      );
    }

    aggregate.markAsRead();
    await this.aggregateStore.save(aggregate);
  }
}

@Injectable()
@CommandHandler(MarkAllNotificationsReadCommand)
export class MarkAllNotificationsReadHandler
  implements ICommandHandler<MarkAllNotificationsReadCommand>
{
  constructor(
    @Inject(NOTIFICATION_READ_REPOSITORY)
    private readonly readRepository: INotificationReadRepository
  ) {}

  async execute(command: MarkAllNotificationsReadCommand): Promise<number> {
    return this.readRepository.markAllAsRead(command.userId);
  }
}

export const NotificationCommandHandlers = [
  SendNotificationHandler,
  BroadcastNotificationHandler,
  MarkNotificationReadHandler,
  MarkAllNotificationsReadHandler,
];
