/**
 * Prisma Order Read Model Repository (Adapter)
 *
 * Implements IOrderReadModelRepository for querying order read models.
 */

import { Injectable, Inject } from '@nestjs/common';
import {
  IOrderReadModelRepository,
  ORDER_READ_MODEL_REPOSITORY,
} from '../../ports/order-read-model.port';
import {
  OrderReadModelDto,
  OrderWithItemsReadModelDto,
  OrderItemReadModelDto,
} from '../../application/dto/order.dto';

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
      update: Partial<Omit<OrderRecord, 'id' | 'items' | 'createdAt' | 'updatedAt'>>;
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
export class PrismaOrderReadModelRepository implements IOrderReadModelRepository {
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

  async upsert(order: Omit<OrderReadModelDto, 'createdAt'>): Promise<void> {
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
      },
      update: {
        status: order.status,
        totalAmount: order.totalAmount,
        currency: order.currency,
        itemCount: order.itemCount,
        trackingNumber: order.trackingNumber ?? null,
      },
    });
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
    await this.prisma.orderReadModel.delete({ where: { id: orderId } }).catch(() => {});
  }

  private mapToDto(order: OrderRecord & { items: OrderItemRecord[] }): OrderWithItemsReadModelDto {
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
