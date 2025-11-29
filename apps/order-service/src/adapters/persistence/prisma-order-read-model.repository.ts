/**
 * Prisma Order Read Model Repository (Adapter)
 *
 * Implements IOrderReadModelRepository for querying order read models.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IOrderReadModelRepository,
  ORDER_READ_MODEL_REPOSITORY,
  VersionedUpsertOptions,
} from '../../ports/order-read-model.port';
import {
  OrderReadModelDto,
  OrderWithItemsReadModelDto,
  OrderItemReadModelDto,
} from '../../application/dto/order.dto';
import { noop } from 'rxjs';

interface OrderReadModelUpdate {
  status?: string;
  totalAmount?: unknown;
  currency?: string;
  itemCount?: number;
  trackingNumber?: string | null;
  version?: number | { increment: number };
  lastEventId?: string | null;
}

interface OrderPrismaClient {
  orderReadModel: {
    findUnique: (args: {
      where: { id: string };
      include?: { items: boolean };
    }) => Promise<OrderRecord | null>;
    findMany: (args: {
      where?: { userId?: string; status?: string };
      orderBy?: { createdAt: 'asc' | 'desc' };
      take?: number;
      skip?: number;
    }) => Promise<OrderRecord[]>;
    upsert: (args: {
      where: { id: string };
      create: Omit<OrderRecord, 'items' | 'createdAt' | 'updatedAt'>;
      update: OrderReadModelUpdate;
    }) => Promise<OrderRecord>;
    delete: (args: { where: { id: string } }) => Promise<OrderRecord>;
  };
  orderItemReadModel: {
    upsert: (args: {
      where: { id: string };
      create: OrderItemRecord;
      update: Partial<Omit<OrderItemRecord, 'id' | 'orderId'>>;
    }) => Promise<OrderItemRecord>;
  };
}

interface OrderRecord {
  id: string;
  userId: string;
  status: string;
  totalAmount: unknown;
  currency: string;
  itemCount: number;
  trackingNumber: string | null;
  version: number;
  lastEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItemRecord[];
}

interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  priceAmount: unknown;
  priceCurrency: string;
}

@Injectable()
export class PrismaOrderReadModelRepository
  implements IOrderReadModelRepository
{
  private readonly logger = new Logger(PrismaOrderReadModelRepository.name);

  constructor(
    @Inject('PrismaClient') private readonly prisma: OrderPrismaClient
  ) {}

  async findById(orderId: string): Promise<OrderWithItemsReadModelDto | null> {
    const order = await this.prisma.orderReadModel.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return null;

    return this.mapToDto({ ...order, items: order.items ?? [] });
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<OrderReadModelDto[]> {
    const orders = await this.prisma.orderReadModel.findMany({
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return orders.map((order) => this.mapToReadModelDto(order));
  }

  async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<OrderReadModelDto[]> {
    const orders = await this.prisma.orderReadModel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return orders.map((order) => this.mapToReadModelDto(order));
  }

  async findRecent(limit: number): Promise<OrderReadModelDto[]> {
    const orders = await this.prisma.orderReadModel.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return orders.map((order) => this.mapToReadModelDto(order));
  }

  async findByStatus(
    status: string,
    options?: { limit?: number; offset?: number }
  ): Promise<OrderReadModelDto[]> {
    const orders = await this.prisma.orderReadModel.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return orders.map((order) => this.mapToReadModelDto(order));
  }

  async upsert(
    order: Omit<OrderReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean> {
    // Check for idempotency - skip if event already processed
    if (options?.eventId) {
      const alreadyProcessed = await this.isEventProcessed(
        order.id,
        options.eventId
      );
      if (alreadyProcessed) {
        this.logger.debug(
          `Event ${options.eventId} already processed for order ${order.id}, skipping`
        );
        return false;
      }
    }

    // Check expected version for optimistic concurrency
    if (options?.expectedVersion !== undefined) {
      const currentVersion = await this.getVersion(order.id);
      if (currentVersion !== options.expectedVersion) {
        this.logger.warn(
          `Version mismatch for order ${order.id}: expected ${options.expectedVersion}, got ${currentVersion}`
        );
        return false;
      }
    }

    // Use provided version (synchronized with event store) or default to 1 for create
    const createVersion = options?.version ?? 1;
    // For update: use provided version or increment by 1
    const updateVersion =
      options?.version !== undefined ? options.version : { increment: 1 };

    await this.prisma.orderReadModel.upsert({
      where: { id: order.id },
      create: {
        id: order.id,
        userId: order.userId,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        itemCount: order.itemCount,
        trackingNumber: order.trackingNumber ?? null,
        version: createVersion,
        lastEventId: options?.eventId ?? null,
      },
      update: {
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        itemCount: order.itemCount,
        trackingNumber: order.trackingNumber ?? null,
        version: updateVersion,
        lastEventId: options?.eventId ?? undefined,
      },
    });

    return true;
  }

  async getVersion(orderId: string): Promise<number> {
    const order = await this.prisma.orderReadModel.findUnique({
      where: { id: orderId },
    });
    return order?.version ?? 0;
  }

  async isEventProcessed(orderId: string, eventId: string): Promise<boolean> {
    const order = await this.prisma.orderReadModel.findUnique({
      where: { id: orderId },
    });
    return order?.lastEventId === eventId;
  }

  async saveItem(item: OrderItemReadModelDto): Promise<void> {
    await this.prisma.orderItemReadModel.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        priceAmount: item.priceAmount,
        priceCurrency: item.priceCurrency,
      },
      update: {
        quantity: item.quantity,
        priceAmount: item.priceAmount,
      },
    });
  }

  async delete(orderId: string): Promise<void> {
    await this.prisma.orderReadModel
      .delete({ where: { id: orderId } })
      .catch(noop);
  }

  private mapToDto(
    order: OrderRecord & { items: OrderItemRecord[] }
  ): OrderWithItemsReadModelDto {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      itemCount: order.itemCount,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        priceAmount: Number(item.priceAmount),
        priceCurrency: item.priceCurrency,
      })),
    };
  }

  private mapToReadModelDto(order: OrderRecord): OrderReadModelDto {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      itemCount: order.itemCount,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}

export { ORDER_READ_MODEL_REPOSITORY };
