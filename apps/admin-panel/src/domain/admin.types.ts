/**
 * User Domain Types
 */

import { UserRole } from '@flexobo/core';

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
export interface CreateUserCommand {
  email: string;
  username: string;
  password: string;
  roles?: UserRole[];
}

/**
 * Update user command
 */
export interface UpdateUserCommand {
  email?: string;
  username?: string;
  password?: string;
  isActive?: boolean;
}

/**
 * Update user roles command
 */
export interface UpdateUserRolesCommand {
  roles: UserRole[];
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
