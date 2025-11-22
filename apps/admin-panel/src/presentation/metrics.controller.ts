/**
 * System Metrics Controller
 */

import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@flexobo/core';
import { SystemMetricsService } from '../application/system-metrics.service';
import {
  SystemMetrics,
  ServiceHealth,
  EventStatistics,
  CacheStatistics,
  CacheEntry,
} from '../domain/admin.types';

@Controller('api/v1/admin/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MetricsController {
  constructor(private readonly systemMetricsService: SystemMetricsService) {}

  /**
   * Get system metrics
   */
  @Get()
  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.systemMetricsService.getSystemMetrics();
  }

  /**
   * Get service health
   */
  @Get('services')
  async getServiceHealth(): Promise<ServiceHealth[]> {
    return this.systemMetricsService.getServiceHealth();
  }

  /**
   * Get event statistics
   */
  @Get('events')
  async getEventStatistics(): Promise<EventStatistics> {
    return this.systemMetricsService.getEventStatistics();
  }

  /**
   * Get cache statistics
   */
  @Get('cache')
  async getCacheStatistics(): Promise<CacheStatistics> {
    return this.systemMetricsService.getCacheStatistics();
  }
}

@Controller('api/v1/admin/cache')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CacheController {
  constructor(private readonly systemMetricsService: SystemMetricsService) {}

  /**
   * List cache entries
   */
  @Get()
  async listCacheEntries(): Promise<CacheEntry[]> {
    return this.systemMetricsService.listCacheEntries();
  }

  /**
   * Invalidate cache entry
   */
  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async invalidateCacheEntry(@Param('key') key: string): Promise<void> {
    await this.systemMetricsService.invalidateCacheEntry(key);
  }

  /**
   * Invalidate all cache
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async invalidateAllCache(): Promise<void> {
    await this.systemMetricsService.invalidateAllCache();
  }
}
