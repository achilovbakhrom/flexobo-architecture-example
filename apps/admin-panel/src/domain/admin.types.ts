/**
 * User Domain Types
 */

import { UserRole } from '@flexobo/core';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsArray, IsBoolean, IsOptional, MinLength, IsEnum } from 'class-validator';

/**
 * User aggregate
 */
export interface User {
  id: string;
  email: string;
  username: string;
  roles: UserRole[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * Create user command
 */
export class CreateUserCommand {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Username', example: 'johndoe' })
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiProperty({ description: 'User password', example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'User roles', required: false, isArray: true, enum: UserRole })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}

/**
 * Update user command
 */
export class UpdateUserCommand {
  @ApiProperty({ description: 'User email address', required: false, example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Username', required: false, example: 'johndoe' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiProperty({ description: 'User password', required: false, minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ description: 'User active status', required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Update user roles command
 */
export class UpdateUserRolesCommand {
  @ApiProperty({ description: 'User roles', isArray: true, enum: UserRole })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}

/**
 * User query result
 */
export interface UserDto {
  id: string;
  email: string;
  username: string;
  roles: UserRole[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Audit log query result
 */
export interface AuditLogDto {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  services: ServiceHealth[];
  events: EventStatistics;
  cache: CacheStatistics;
  timestamp: Date;
}

/**
 * Service health status
 */
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
}

/**
 * Event statistics
 */
export interface EventStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsLast24h: number;
  eventsLast7d: number;
  averageProcessingTime: number;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  totalKeys: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  evictions: number;
}

/**
 * Cache entry
 */
export interface CacheEntry {
  key: string;
  value: unknown;
  ttl: number;
  createdAt: Date;
}

/**
 * List query parameters
 */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
