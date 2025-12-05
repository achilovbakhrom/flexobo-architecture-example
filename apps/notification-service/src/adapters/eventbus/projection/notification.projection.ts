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
  INotificationReadRepository,
  NOTIFICATION_READ_REPOSITORY,
  NotificationReadModel,
} from '../../../ports/notification.repository';
import { EVENT_TYPES } from '../../../domain/events/event.constants';
import {
  NotificationType,
  NotificationCategory,
  NotificationChannel,
} from '../../../domain/constants/enums';

interface NotificationCreatedData {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
}

interface NotificationMarkedReadData {
  readAt: Date;
}

type NotificationEventData = NotificationCreatedData | NotificationMarkedReadData;
type NotificationEventPayload = EventPayload<NotificationEventData>;

@Injectable()
export class NotificationProjection extends BaseProjection<
  NotificationReadModel,
  NotificationEventPayload
> {
  constructor(
    @Inject(NOTIFICATION_READ_REPOSITORY)
    private readonly readModelRepository: INotificationReadRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null
  ) {
    super(rabbitMQConsumer, NotificationProjection.name, eventBuffer);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: 'notification.projection',
      routingKeys: ['notification.created', 'notification.marked_read'],
      durable: true,
      prefetchCount: 10,
      maxRetries: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(
    aggregateId: string
  ): Promise<number> {
    const entity = await this.readModelRepository.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(
    event: NotificationEventPayload
  ): Promise<void> {
    switch (event.type) {
      case EVENT_TYPES.NOTIFICATION.CREATED:
        await this.onNotificationCreated(
          event as EventPayload<NotificationCreatedData>
        );
        break;

      case EVENT_TYPES.NOTIFICATION.MARKED_READ:
        await this.onNotificationMarkedRead(
          event as EventPayload<NotificationMarkedReadData>
        );
        break;

      default:
        this.logger.warn(`Unknown notification event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as NotificationEventPayload;
    await this.applyEvent(payload);
  }

  private async onNotificationCreated(
    event: EventPayload<NotificationCreatedData>
  ): Promise<void> {
    const existing = await this.readModelRepository.findById(event.aggregateId);
    this.checkCreateIdempotency(existing, event);

    const { data } = event;
    await this.readModelRepository.save({
      id: event.aggregateId,
      userId: data.userId,
      type: data.type,
      category: data.category,
      title: data.title,
      body: data.body,
      data: data.data,
      channels: data.channels,
      isRead: false,
      createdAt: new Date(event.occurredAt),
      version: event.version,
    });
  }

  private async onNotificationMarkedRead(
    event: EventPayload<NotificationMarkedReadData>
  ): Promise<void> {
    const existing = await this.readModelRepository.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.readModelRepository.update({
      id: event.aggregateId,
      isRead: true,
      readAt: new Date(event.data.readAt),
      version: event.version,
    });
  }
}
