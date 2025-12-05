import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../prisma.module';
import {
  INotificationReadRepository,
  NotificationReadModel,
  NotificationListResult,
} from '../../ports/notification.repository';
import { NotificationType, NotificationCategory, NotificationChannel } from '../../domain/constants/enums';

interface NotificationPrismaClient {
  notification: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    updateMany: (args: any) => Promise<{ count: number }>;
  };
}

@Injectable()
export class PrismaNotificationReadRepository implements INotificationReadRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: NotificationPrismaClient
  ) {}

  async findById(id: string): Promise<NotificationReadModel | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return null;
    }

    return this.mapToReadModel(notification);
  }

  async findByUserId(
    userId: string,
    options?: {
      type?: NotificationType;
      unreadOnly?: boolean;
      page?: number;
      pageSize?: number;
    }
  ): Promise<NotificationListResult> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId };

    if (options?.type) {
      where['type'] = options.type;
    }

    if (options?.unreadOnly) {
      where['isRead'] = false;
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: items.map((n) => this.mapToReadModel(n)),
      total,
      page,
      pageSize,
    };
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async save(notification: NotificationReadModel): Promise<void> {
    await this.prisma.notification.create({
      data: {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? undefined,
        channels: notification.channels,
        isRead: notification.isRead,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        version: notification.version,
      },
    });
  }

  async update(notification: Partial<NotificationReadModel> & { id: string }): Promise<void> {
    const { id, ...data } = notification;
    await this.prisma.notification.update({
      where: { id },
      data: {
        ...data,
        data: data.data ?? undefined,
      },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }

  private mapToReadModel(notification: {
    id: string;
    userId: string;
    type: string;
    category: string;
    title: string;
    body: string;
    data: unknown;
    channels: string[];
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
    version: number;
  }): NotificationReadModel {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type as NotificationType,
      category: notification.category as NotificationCategory,
      title: notification.title,
      body: notification.body,
      data: notification.data as Record<string, unknown> | undefined,
      channels: notification.channels as NotificationChannel[],
      isRead: notification.isRead,
      readAt: notification.readAt ?? undefined,
      createdAt: notification.createdAt,
      version: notification.version,
    };
  }
}
