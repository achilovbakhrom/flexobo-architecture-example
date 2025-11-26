/**
 * Prisma Order History Repository (Adapter)
 *
 * Implements IOrderHistoryRepository for audit log queries.
 */

import { Injectable, Inject } from '@nestjs/common';
import {
  IOrderHistoryRepository,
  ORDER_HISTORY_REPOSITORY,
} from '../../ports/order-history.repository.port';
import {
  OrderHistoryDto,
  CreateOrderHistoryEntryDto,
  OrderHistoryQueryDto,
} from '../../application/dto/order-history.dto';

interface OrderHistoryPrismaClient {
  orderHistoryReadModel: {
    findUnique: (args: { where: { id: string } }) => Promise<OrderHistoryRecord | null>;
    findMany: (args: {
      where?: {
        orderId?: string;
        eventType?: string;
        occurredAt?: { gte?: Date; lte?: Date };
      };
      orderBy?: { occurredAt: 'asc' | 'desc' };
      take?: number;
      skip?: number;
    }) => Promise<OrderHistoryRecord[]>;
    findFirst: (args: {
      where: { orderId: string };
      orderBy: { occurredAt: 'desc' };
    }) => Promise<OrderHistoryRecord | null>;
    create: (args: { data: CreateOrderHistoryRecord }) => Promise<OrderHistoryRecord>;
    count: (args: { where: { orderId: string } }) => Promise<number>;
  };
}

interface OrderHistoryRecord {
  id: string;
  orderId: string;
  eventType: string;
  eventData: unknown;
  previousState: string | null;
  newState: string | null;
  changedBy: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  occurredAt: Date;
}

interface CreateOrderHistoryRecord {
  orderId: string;
  eventType: string;
  eventData: unknown;
  previousState?: string | null;
  newState?: string | null;
  changedBy?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class PrismaOrderHistoryRepository implements IOrderHistoryRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: OrderHistoryPrismaClient
  ) {}

  async findByOrderId(orderId: string, options?: { limit?: number; offset?: number }): Promise<OrderHistoryDto[]> {
    const entries = await this.prisma.orderHistoryReadModel.findMany({
      where: { orderId },
      orderBy: { occurredAt: 'desc' },
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
    });
    return entries.map((e) => this.mapToDto(e));
  }

  async findByEventType(eventType: string, options?: { limit?: number; offset?: number }): Promise<OrderHistoryDto[]> {
    const entries = await this.prisma.orderHistoryReadModel.findMany({
      where: { eventType },
      orderBy: { occurredAt: 'desc' },
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
    });
    return entries.map((e) => this.mapToDto(e));
  }

  async query(params: OrderHistoryQueryDto): Promise<OrderHistoryDto[]> {
    const entries = await this.prisma.orderHistoryReadModel.findMany({
      where: {
        ...(params.orderId && { orderId: params.orderId }),
        ...(params.eventType && { eventType: params.eventType }),
        ...(params.startDate || params.endDate
          ? {
              occurredAt: {
                ...(params.startDate && { gte: params.startDate }),
                ...(params.endDate && { lte: params.endDate }),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: params.limit ?? 100,
      skip: params.offset ?? 0,
    });
    return entries.map((e) => this.mapToDto(e));
  }

  async findById(historyId: string): Promise<OrderHistoryDto | null> {
    const entry = await this.prisma.orderHistoryReadModel.findUnique({ where: { id: historyId } });
    return entry ? this.mapToDto(entry) : null;
  }

  async create(entry: CreateOrderHistoryEntryDto): Promise<OrderHistoryDto> {
    const created = await this.prisma.orderHistoryReadModel.create({
      data: {
        orderId: entry.orderId,
        eventType: entry.eventType,
        eventData: entry.eventData,
        previousState: entry.previousState ?? null,
        newState: entry.newState ?? null,
        changedBy: entry.changedBy ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
    return this.mapToDto(created);
  }

  async findLatestByOrderId(orderId: string): Promise<OrderHistoryDto | null> {
    const entry = await this.prisma.orderHistoryReadModel.findFirst({
      where: { orderId },
      orderBy: { occurredAt: 'desc' },
    });
    return entry ? this.mapToDto(entry) : null;
  }

  async countByOrderId(orderId: string): Promise<number> {
    return this.prisma.orderHistoryReadModel.count({ where: { orderId } });
  }

  private mapToDto(entry: OrderHistoryRecord): OrderHistoryDto {
    return {
      id: entry.id,
      orderId: entry.orderId,
      eventType: entry.eventType,
      eventData: entry.eventData as Record<string, unknown>,
      previousState: entry.previousState,
      newState: entry.newState,
      changedBy: entry.changedBy,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      occurredAt: entry.occurredAt,
    };
  }
}

export { ORDER_HISTORY_REPOSITORY };
