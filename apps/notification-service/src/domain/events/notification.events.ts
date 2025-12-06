import { NotificationType, NotificationCategory, NotificationChannel } from '../constants/enums';

export enum NotificationEventType {
  Created = 'notification.created',
  MarkedRead = 'notification.marked_read',
}

export interface NotificationCreatedEventData {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
}

export interface NotificationMarkedReadEventData {
  readAt: Date;
}

export interface NotificationCreatedEvent {
  type: NotificationEventType.Created;
  data: NotificationCreatedEventData;
}

export interface NotificationMarkedReadEvent {
  type: NotificationEventType.MarkedRead;
  data: NotificationMarkedReadEventData;
}

export type NotificationEvent = NotificationCreatedEvent | NotificationMarkedReadEvent;
