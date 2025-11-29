/**
 * Prisma Dead Letter Repository (Adapter)
 *
 * Implements IDeadLetterRepository for storing unroutable/failed messages.
 */

import { Injectable, Inject } from '@nestjs/common';
import {
  IDeadLetterRepository,
  DEAD_LETTER_REPOSITORY,
} from '../../ports/dead-letter.repository.port';
import {
  DeadLetterDto,
  CreateDeadLetterDto,
  DeadLetterQueryDto,
} from '../../application/dto/dead-letter.dto';

interface DeadLetterPrismaClient {
  deadLetterMessage: {
    findUnique: (args: {
      where: { id: string };
    }) => Promise<DeadLetterRecord | null>;
    findMany: (args: {
      where?: {
        routingKey?: string;
        exchange?: string;
        receivedAt?: { gte?: Date; lte?: Date; lt?: Date };
      };
      orderBy?: { receivedAt: 'asc' | 'desc' };
      take?: number;
      skip?: number;
    }) => Promise<DeadLetterRecord[]>;
    create: (args: {
      data: CreateDeadLetterRecord;
    }) => Promise<DeadLetterRecord>;
    count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
    delete: (args: { where: { id: string } }) => Promise<DeadLetterRecord>;
    deleteMany: (args: {
      where: { receivedAt: { lt: Date } };
    }) => Promise<{ count: number }>;
  };
}

interface DeadLetterRecord {
  id: string;
  routingKey: string;
  exchange: string;
  payload: unknown;
  error: string | null;
  retryCount: number;
  originalTimestamp: Date | null;
  receivedAt: Date;
  metadata: unknown | null;
}

interface CreateDeadLetterRecord {
  routingKey: string;
  exchange: string;
  payload: unknown;
  error?: string | null;
  retryCount?: number;
  originalTimestamp?: Date | null;
  metadata?: unknown | null;
}

@Injectable()
export class PrismaDeadLetterRepository implements IDeadLetterRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: DeadLetterPrismaClient
  ) {}

  async create(entry: CreateDeadLetterDto): Promise<DeadLetterDto> {
    const created = await this.prisma.deadLetterMessage.create({
      data: {
        routingKey: entry.routingKey,
        exchange: entry.exchange,
        payload: entry.payload,
        error: entry.error ?? null,
        retryCount: entry.retryCount ?? 0,
        originalTimestamp: entry.originalTimestamp ?? null,
        metadata: entry.metadata ?? null,
      },
    });
    return this.mapToDto(created);
  }

  async findById(id: string): Promise<DeadLetterDto | null> {
    const record = await this.prisma.deadLetterMessage.findUnique({
      where: { id },
    });
    return record ? this.mapToDto(record) : null;
  }

  async findByRoutingKey(
    routingKey: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DeadLetterDto[]> {
    const records = await this.prisma.deadLetterMessage.findMany({
      where: { routingKey },
      orderBy: { receivedAt: 'desc' },
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
    });
    return records.map((r) => this.mapToDto(r));
  }

  async query(params: DeadLetterQueryDto): Promise<DeadLetterDto[]> {
    const records = await this.prisma.deadLetterMessage.findMany({
      where: {
        ...(params.routingKey && { routingKey: params.routingKey }),
        ...(params.exchange && { exchange: params.exchange }),
        ...(params.startDate || params.endDate
          ? {
              receivedAt: {
                ...(params.startDate && { gte: params.startDate }),
                ...(params.endDate && { lte: params.endDate }),
              },
            }
          : {}),
      },
      orderBy: { receivedAt: 'desc' },
      take: params.limit ?? 100,
      skip: params.offset ?? 0,
    });
    return records.map((r) => this.mapToDto(r));
  }

  async count(): Promise<number> {
    return this.prisma.deadLetterMessage.count();
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      await this.prisma.deadLetterMessage.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.deadLetterMessage.deleteMany({
      where: { receivedAt: { lt: date } },
    });
    return result.count;
  }

  private mapToDto(record: DeadLetterRecord): DeadLetterDto {
    return {
      id: record.id,
      routingKey: record.routingKey,
      exchange: record.exchange,
      payload: record.payload as Record<string, unknown>,
      error: record.error,
      retryCount: record.retryCount,
      originalTimestamp: record.originalTimestamp,
      receivedAt: record.receivedAt,
      metadata: record.metadata as Record<string, unknown> | null,
    };
  }
}

export { DEAD_LETTER_REPOSITORY };
