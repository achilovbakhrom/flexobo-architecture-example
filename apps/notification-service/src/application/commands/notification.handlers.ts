import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, Result, Success, Failure } from '@flexobo/core';
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
export class SendNotificationHandler implements ICommandHandler<SendNotificationCommand, void> {
  private readonly logger = new Logger(SendNotificationHandler.name);

  constructor(
    @Inject(NOTIFICATION_AGGREGATE_STORE)
    private readonly aggregateStore: INotificationAggregateStore,
    @Inject(PUSH_SERVICE)
    private readonly pushService: IPushService,
    @Inject(SSE_MANAGER)
    private readonly sseManager: ISSEManager
  ) {}

  async execute(command: SendNotificationCommand): Promise<Result<void, Error>> {
    try {
      this.logger.debug(
        `Sending notification to ${command.userIds.length} users: ${command.title}`
      );

      for (const userId of command.userIds) {
        const notificationId = uuidv4();

        if (command.type === NotificationType.User) {
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

        if (command.channels.includes(NotificationChannel.Sse)) {
          await this.sseManager.sendToUser(userId, payload);
        }
      }

      if (command.channels.includes(NotificationChannel.Push)) {
        await this.pushService.sendToUsers(command.userIds, {
          title: command.title,
          body: command.body,
          data: command.data as Record<string, string> | undefined,
        });
      }

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(BroadcastNotificationCommand)
export class BroadcastNotificationHandler
  implements ICommandHandler<BroadcastNotificationCommand, void>
{
  private readonly logger = new Logger(BroadcastNotificationHandler.name);

  constructor(
    @Inject(PUSH_SERVICE)
    private readonly pushService: IPushService,
    @Inject(SSE_MANAGER)
    private readonly sseManager: ISSEManager
  ) {}

  async execute(command: BroadcastNotificationCommand): Promise<Result<void, Error>> {
    try {
      this.logger.debug(`Broadcasting notification: ${command.title}`);

      const payload: SSEPayload = {
        type: command.type,
        category: command.category,
        title: command.title,
        body: command.body,
        data: command.data,
        timestamp: Date.now(),
      };

      if (command.channels.includes(NotificationChannel.Sse)) {
        await this.sseManager.broadcast(payload);
      }

      if (command.channels.includes(NotificationChannel.Push)) {
        await this.pushService.sendToAll({
          title: command.title,
          body: command.body,
          data: command.data as Record<string, string> | undefined,
        });
      }

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(MarkNotificationReadCommand)
export class MarkNotificationReadHandler
  implements ICommandHandler<MarkNotificationReadCommand, void>
{
  constructor(
    @Inject(NOTIFICATION_AGGREGATE_STORE)
    private readonly aggregateStore: INotificationAggregateStore,
    @Inject(NOTIFICATION_READ_REPOSITORY)
    private readonly readRepository: INotificationReadRepository
  ) {}

  async execute(command: MarkNotificationReadCommand): Promise<Result<void, Error>> {
    try {
      const notification = await this.readRepository.findById(command.notificationId);

      if (!notification) {
        return new Failure(
          new NotFoundException(`Notification ${command.notificationId} not found`)
        );
      }

      if (notification.userId !== command.userId) {
        return new Failure(
          new NotFoundException(`Notification ${command.notificationId} not found`)
        );
      }

      if (notification.isRead) {
        return new Success(undefined);
      }

      const aggregate = await this.aggregateStore.load(command.notificationId);
      if (!aggregate) {
        return new Failure(
          new NotFoundException(`Notification ${command.notificationId} not found`)
        );
      }

      aggregate.markAsRead();
      await this.aggregateStore.save(aggregate);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(MarkAllNotificationsReadCommand)
export class MarkAllNotificationsReadHandler
  implements ICommandHandler<MarkAllNotificationsReadCommand, number>
{
  constructor(
    @Inject(NOTIFICATION_READ_REPOSITORY)
    private readonly readRepository: INotificationReadRepository
  ) {}

  async execute(command: MarkAllNotificationsReadCommand): Promise<Result<number, Error>> {
    try {
      const count = await this.readRepository.markAllAsRead(command.userId);
      return new Success(count);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

export const NotificationCommandHandlers = [
  SendNotificationHandler,
  BroadcastNotificationHandler,
  MarkNotificationReadHandler,
  MarkAllNotificationsReadHandler,
];
