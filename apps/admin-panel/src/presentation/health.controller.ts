/**
 * Health Check Controller
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Service information', description: 'Returns basic service information and available endpoints' })
  @ApiResponse({ status: 200, description: 'Service information retrieved' })
  getRoot() {
    return {
      service: 'Admin Panel',
      status: 'running',
      version: '1.0.0',
      endpoints: {
        users: '/api/v1/admin/users',
        auditLogs: '/api/v1/admin/audit-logs',
        metrics: '/api/v1/admin/metrics',
        cache: '/api/v1/admin/cache',
        health: '/api/health',
      },
    };
  }

  @Get('api/health')
  @ApiOperation({ summary: 'Health check', description: 'Returns service health status and uptime' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
