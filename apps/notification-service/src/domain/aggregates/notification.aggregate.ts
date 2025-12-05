import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { NotificationType, NotificationCategory, NotificationChannel } from '../constants/enums';
import {
  NotificationEventType,
  NotificationCreatedEventData,
  NotificationMarkedReadEventData,
} from '../events/notification.events';

export interface NotificationState {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface CreateNotificationParams {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
}

export interface NotificationSnapshotData {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export class NotificationAggregate extends AggregateRoot {
  private state: NotificationState = {
    userId: '',
    type: NotificationType.USER,
    category: NotificationCategory.SYSTEM,
    title: '',
    body: '',
    channels: [],
    isRead: false,
    createdAt: new Date(),
  };

  get userId(): string {
    return this.state.userId;
  }

  get type(): NotificationType {
    return this.state.type;
  }

  get category(): NotificationCategory {
    return this.state.category;
  }

  get title(): string {
    return this.state.title;
  }

  get body(): string {
    return this.state.body;
  }

  get data(): Record<string, unknown> | undefined {
    return this.state.data;
  }

  get channels(): NotificationChannel[] {
    return this.state.channels;
  }

  get isRead(): boolean {
    return this.state.isRead;
  }

  get readAt(): Date | undefined {
    return this.state.readAt;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }

  static create(params: CreateNotificationParams): NotificationAggregate {
    const aggregate = new NotificationAggregate(params.id);
    aggregate.createNotification(params);
    return aggregate;
  }

  private createNotification(params: CreateNotificationParams): void {
    const event = this.createEvent(NotificationEventType.Created, {
      userId: params.userId,
      type: params.type,
      category: params.category,
      title: params.title,
      body: params.body,
      data: params.data,
      channels: params.channels,
    });
    this.addEvent(event);
    this.apply(event);
  }

  static fromEvents(events: DomainEvent[]): NotificationAggregate {
    if (events.length === 0) {
      throw new Error('Cannot create NotificationAggregate from empty events');
    }
    const aggregate = new NotificationAggregate(events[0].aggregateId);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  static fromSnapshot(
    snapshotData: NotificationSnapshotData,
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): NotificationAggregate {
    const aggregate = new NotificationAggregate(snapshotData.id);
    aggregate.state = {
      userId: snapshotData.userId,
      type: snapshotData.type,
      category: snapshotData.category,
      title: snapshotData.title,
      body: snapshotData.body,
      data: snapshotData.data,
      channels: snapshotData.channels,
      isRead: snapshotData.isRead,
      readAt: snapshotData.readAt,
      createdAt: snapshotData.createdAt,
    };
    aggregate._version = snapshotVersion;

    if (subsequentEvents.length > 0) {
      aggregate.loadFromHistory(subsequentEvents);
    }

    return aggregate;
  }

  toSnapshot(): NotificationSnapshotData {
    return {
      id: this.id,
      userId: this.state.userId,
      type: this.state.type,
      category: this.state.category,
      title: this.state.title,
      body: this.state.body,
      data: this.state.data,
      channels: this.state.channels,
      isRead: this.state.isRead,
      readAt: this.state.readAt,
      createdAt: this.state.createdAt,
    };
  }

  markAsRead(): void {
    if (this.state.isRead) {
      return;
    }

    const event = this.createEvent(NotificationEventType.MarkedRead, {
      readAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case NotificationEventType.Created:
        this.applyNotificationCreated(event.data as unknown as NotificationCreatedEventData);
        break;
      case NotificationEventType.MarkedRead:
        this.applyNotificationMarkedRead(event.data as unknown as NotificationMarkedReadEventData);
        break;
    }
  }

  private applyNotificationCreated(data: NotificationCreatedEventData): void {
    this.state = {
      userId: data.userId,
      type: data.type,
      category: data.category,
      title: data.title,
      body: data.body,
      data: data.data,
      channels: data.channels,
      isRead: false,
      createdAt: new Date(),
    };
  }

  private applyNotificationMarkedRead(data: NotificationMarkedReadEventData): void {
    this.state.isRead = true;
    this.state.readAt = data.readAt;
  }
}
