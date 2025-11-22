/**
 * Audit Log Controller
 */

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@flexobo/core';
import { AuditLogService } from '../application/audit-log.service';
import {
  AuditLogDto,
  PaginatedResult,
  ListQueryParams,
} from '../domain/admin.types';

@Controller('api/v1/admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * List audit logs
   */
  @Get()
  async listAuditLogs(
    @Query() query: ListQueryParams
  ): Promise<PaginatedResult<AuditLogDto>> {
    return this.auditLogService.listAuditLogs(query);
  }

  /**
   * Get audit log by ID
   */
  @Get(':id')
  async getAuditLogById(@Param('id') id: string): Promise<AuditLogDto | null> {
    return this.auditLogService.getAuditLogById(id);
  }
}
