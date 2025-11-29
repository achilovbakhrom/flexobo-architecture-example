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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@flexobo/core';
import { SystemMetricsService } from '../application/system-metrics.service';
import {
  SystemMetrics,
  ServiceHealth,
  EventStatistics,
  CacheStatistics,
  CacheEntry,
} from '../domain/admin.types';

@ApiTags('Admin - System Metrics')
@ApiBearerAuth()
@Controller('api/v1/admin/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MetricsController {
  constructor(private readonly systemMetricsService: SystemMetricsService) {}

  /**
   * Get system metrics
   */
  @Get()
  @ApiOperation({ summary: 'Get system metrics', description: 'Retrieves comprehensive system metrics including services, events, and cache' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.systemMetricsService.getSystemMetrics();
  }

  /**
   * Get service health
   */
  @Get('services')
  @ApiOperation({ summary: 'Get service health', description: 'Retrieves health status for all microservices' })
  @ApiResponse({ status: 200, description: 'Service health retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getServiceHealth(): Promise<ServiceHealth[]> {
    return this.systemMetricsService.getServiceHealth();
  }

  /**
   * Get event statistics
   */
  @Get('events')
  @ApiOperation({ summary: 'Get event statistics', description: 'Retrieves statistics about system events and processing' })
  @ApiResponse({ status: 200, description: 'Event statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getEventStatistics(): Promise<EventStatistics> {
    return this.systemMetricsService.getEventStatistics();
  }

  /**
   * Get cache statistics
   */
  @Get('cache')
  @ApiOperation({ summary: 'Get cache statistics', description: 'Retrieves cache performance metrics and usage statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getCacheStatistics(): Promise<CacheStatistics> {
    return this.systemMetricsService.getCacheStatistics();
  }
}

@ApiTags('Admin - Cache Management')
@ApiBearerAuth()
@Controller('api/v1/admin/cache')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CacheController {
  constructor(private readonly systemMetricsService: SystemMetricsService) {}

  /**
   * List cache entries
   */
  @Get()
  @ApiOperation({ summary: 'List cache entries', description: 'Retrieves all cache entries currently stored in the system' })
  @ApiResponse({ status: 200, description: 'Cache entries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async listCacheEntries(): Promise<CacheEntry[]> {
    return this.systemMetricsService.listCacheEntries();
  }

  /**
   * Invalidate cache entry
   */
  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidate cache entry', description: 'Removes a specific cache entry by key' })
  @ApiParam({ name: 'key', description: 'Cache key to invalidate' })
  @ApiResponse({ status: 204, description: 'Cache entry invalidated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async invalidateCacheEntry(@Param('key') key: string): Promise<void> {
    await this.systemMetricsService.invalidateCacheEntry(key);
  }

  /**
   * Invalidate all cache
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidate all cache', description: 'Clears all cache entries from the system' })
  @ApiResponse({ status: 204, description: 'All cache invalidated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async invalidateAllCache(): Promise<void> {
    await this.systemMetricsService.invalidateAllCache();
  }
}
