/**
 * Admin Panel Module
 */

import { Module } from '@nestjs/common';
import { AuthModule } from '@flexobo/core';
import { HealthController } from './presentation/health.controller';
import { UserController } from './presentation/user.controller';
import { AuditLogController } from './presentation/audit-log.controller';
import {
  MetricsController,
  CacheController,
} from './presentation/metrics.controller';
import {
  UserManagementService,
  UserRepository,
} from './application/user-management.service';
import {
  AuditLogService,
  AuditLogRepository,
} from './application/audit-log.service';
import { SystemMetricsService } from './application/system-metrics.service';

@Module({
  imports: [
    // Import auth module with JWT configuration
    AuthModule.forRoot({
      jwt: {
        secret:
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        accessTokenExpiry: 900, // 15 minutes in seconds
        refreshTokenExpiry: 604800, // 7 days in seconds
      },
      globalGuard: false, // Use guards on specific controllers
    }),
  ],
  controllers: [
    HealthController,
    UserController,
    AuditLogController,
    MetricsController,
    CacheController,
  ],
  providers: [
    // Application services
    UserManagementService,
    AuditLogService,
    SystemMetricsService,
    // Repositories
    UserRepository,
    AuditLogRepository,
  ],
})
export class AdminPanelModule {}
