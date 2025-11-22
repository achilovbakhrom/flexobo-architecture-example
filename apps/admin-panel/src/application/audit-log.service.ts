/**
 * Audit Log Service
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AuditLog,
  AuditLogDto,
  PaginatedResult,
  ListQueryParams,
} from '../domain/admin.types';

/**
 * In-memory audit log repository for demo purposes
 * In production, use Prisma with PostgreSQL
 */
@Injectable()
export class AuditLogRepository {
  private logs: Map<string, AuditLog> = new Map();

  async findAll(params: ListQueryParams): Promise<PaginatedResult<AuditLog>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let logs = Array.from(this.logs.values());

    // Apply search filter
    if (params.search) {
      const search = params.search.toLowerCase();
      logs = logs.filter(
        (log) =>
          log.username.toLowerCase().includes(search) ||
          log.action.toLowerCase().includes(search) ||
          log.resource.toLowerCase().includes(search)
      );
    }

    // Sort by timestamp descending (most recent first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = logs.length;
    const data = logs.slice(offset, offset + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.logs.get(id) || null;
  }

  async save(log: AuditLog): Promise<void> {
    this.logs.set(log.id, log);
  }
}

/**
 * Audit log service
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * List audit logs
   */
  async listAuditLogs(
    params: ListQueryParams
  ): Promise<PaginatedResult<AuditLogDto>> {
    const result = await this.auditLogRepository.findAll(params);

    return {
      ...result,
      data: result.data.map((log) => this.toDto(log)),
    };
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(id: string): Promise<AuditLogDto | null> {
    const log = await this.auditLogRepository.findById(id);

    if (!log) {
      return null;
    }

    return this.toDto(log);
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(
    userId: string,
    username: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const log: AuditLog = {
      id: randomUUID(),
      userId,
      username,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    };

    await this.auditLogRepository.save(log);
  }

  /**
   * Convert audit log to DTO
   */
  private toDto(log: AuditLog): AuditLogDto {
    return {
      id: log.id,
      userId: log.userId,
      username: log.username,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.timestamp.toISOString(),
    };
  }
}
