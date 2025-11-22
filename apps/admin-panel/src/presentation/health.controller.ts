/**
 * Health Check Controller
 */

import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
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
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
