import { IAggregateStore } from '@flexobo/core';
import { NotificationAggregate } from '../domain/aggregates/notification.aggregate';
import { NotificationType, NotificationCategory, NotificationChannel } from '../domain/constants/enums';

export const NOTIFICATION_AGGREGATE_STORE = Symbol('NOTIFICATION_AGGREGATE_STORE');
export const NOTIFICATION_READ_REPOSITORY = Symbol('NOTIFICATION_READ_REPOSITORY');

export interface NotificationReadModel {
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
  version: number;
}

export interface NotificationListResult {
  items: NotificationReadModel[];
  total: number;
  page: number;
  pageSize: number;
}

export interface INotificationReadRepository {
  findById(id: string): Promise<NotificationReadModel | null>;
  findByUserId(
    userId: string,
    options?: {
      type?: NotificationType;
      unreadOnly?: boolean;
      page?: number;
      pageSize?: number;
    }
  ): Promise<NotificationListResult>;
  countUnreadByUserId(userId: string): Promise<number>;
  save(notification: NotificationReadModel): Promise<void>;
  update(notification: Partial<NotificationReadModel> & { id: string }): Promise<void>;
  markAllAsRead(userId: string): Promise<number>;
}

export type INotificationAggregateStore = IAggregateStore<NotificationAggregate>;
