/**
 * Audit Log Controller
 */

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@flexobo/shared-kernel';
import { AuditLogService } from '../application/audit-log.service';
import {
  AuditLogDto,
  PaginatedResult,
  ListQueryParams,
} from '../domain/admin.types';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth()
@Controller('api/v1/admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * List audit logs
   */
  @Get()
  @ApiOperation({ summary: 'List audit logs', description: 'Retrieves a paginated list of system audit logs for compliance and monitoring' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async listAuditLogs(
    @Query() query: ListQueryParams
  ): Promise<PaginatedResult<AuditLogDto>> {
    return this.auditLogService.listAuditLogs(query);
  }

  /**
   * Get audit log by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID', description: 'Retrieves detailed information about a specific audit log entry' })
  @ApiParam({ name: 'id', description: 'Audit log ID' })
  @ApiResponse({ status: 200, description: 'Audit log found' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAuditLogById(@Param('id') id: string): Promise<AuditLogDto | null> {
    return this.auditLogService.getAuditLogById(id);
  }
}
