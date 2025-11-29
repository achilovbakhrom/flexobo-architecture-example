/**
 * Prisma Product Read Model Repository (Adapter)
 *
 * Implements IProductReadModelRepository for query operations.
 * This is the read side of CQRS for products.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IProductReadModelRepository } from '../../ports/product.repository.port';
import { ProductDto } from '../../application/dto/product.dto';

interface ProductPrismaClient {
  productReadModel: {
    findUnique: (args: {
      where: { id?: string; sku?: string };
    }) => Promise<ProductRecord | null>;
    findMany: (args: {
      where?: {
        category?: string;
        isActive?: boolean;
        name?: { contains: string; mode: 'insensitive' };
      };
      orderBy?: { createdAt: 'asc' | 'desc' };
      take?: number;
      skip?: number;
    }) => Promise<ProductRecord[]>;
    upsert: (args: {
      where: { id: string };
      create: UpsertProductRecord;
      update: UpsertProductRecord;
    }) => Promise<ProductRecord>;
    delete: (args: { where: { id: string } }) => Promise<ProductRecord>;
  };
}

interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  priceAmount: unknown;
  currency: string;
  stockLevel: number;
  isActive: boolean;
  imageUrl: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface UpsertProductRecord {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  priceAmount: number;
  currency: string;
  stockLevel: number;
  isActive: boolean;
  imageUrl?: string | null;
  metadata?: unknown;
  updatedAt: Date;
}

@Injectable()
export class PrismaProductReadModelRepository
  implements IProductReadModelRepository
{
  constructor(
    @Inject('PrismaClient') private readonly prisma: ProductPrismaClient
  ) {}

  async findById(productId: string): Promise<ProductDto | null> {
    const product = await this.prisma.productReadModel.findUnique({
      where: { id: productId },
    });
    return product ? this.mapToDto(product) : null;
  }

  async findBySku(sku: string): Promise<ProductDto | null> {
    const product = await this.prisma.productReadModel.findUnique({
      where: { sku },
    });
    return product ? this.mapToDto(product) : null;
  }

  async findByCategory(
    category: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ProductDto[]> {
    const products = await this.prisma.productReadModel.findMany({
      where: { category, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
    return products.map((p) => this.mapToDto(p));
  }

  async findActive(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ProductDto[]> {
    const products = await this.prisma.productReadModel.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
    return products.map((p) => this.mapToDto(p));
  }

  async search(
    query: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ProductDto[]> {
    const products = await this.prisma.productReadModel.findMany({
      where: { name: { contains: query, mode: 'insensitive' }, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
    return products.map((p) => this.mapToDto(p));
  }

  async upsert(product: {
    id: string;
    sku: string;
    name: string;
    description?: string | null;
    category?: string | null;
    priceAmount: number;
    currency: string;
    stockLevel: number;
    isActive: boolean;
    imageUrl?: string | null;
    metadata?: Record<string, unknown> | null;
    updatedAt: Date;
  }): Promise<void> {
    await this.prisma.productReadModel.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description ?? null,
        category: product.category ?? null,
        priceAmount: product.priceAmount,
        currency: product.currency,
        stockLevel: product.stockLevel,
        isActive: product.isActive,
        imageUrl: product.imageUrl ?? null,
        metadata: product.metadata ?? null,
        updatedAt: product.updatedAt,
      },
      update: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description ?? null,
        category: product.category ?? null,
        priceAmount: product.priceAmount,
        currency: product.currency,
        stockLevel: product.stockLevel,
        isActive: product.isActive,
        imageUrl: product.imageUrl ?? null,
        metadata: product.metadata ?? null,
        updatedAt: product.updatedAt,
      },
    });
  }

  async delete(productId: string): Promise<void> {
    try {
      await this.prisma.productReadModel.delete({ where: { id: productId } });
    } catch {
      // Ignore if not found
    }
  }

  private mapToDto(product: ProductRecord): ProductDto {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      priceAmount: Number(product.priceAmount),
      currency: product.currency,
      stockLevel: product.stockLevel,
      isActive: product.isActive,
      imageUrl: product.imageUrl,
      metadata: product.metadata as Record<string, unknown> | null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
