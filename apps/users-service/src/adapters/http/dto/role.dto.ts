import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

// ============================================================
// Request DTOs
// ============================================================

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'COMPANY_ADMIN' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Role permissions',
    example: ['company:read', 'company:write', 'users:read'],
  })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @ApiPropertyOptional({ description: 'Role description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Is system role (cannot be deleted)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_system?: boolean;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Role name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Role permissions' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Role description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Is role active' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'User ID to assign role to' })
  @IsUUID()
  @IsNotEmpty()
  user_id!: string;

  @ApiProperty({ description: 'Role ID to assign' })
  @IsUUID()
  @IsNotEmpty()
  role_id!: string;

  @ApiPropertyOptional({ description: 'Company ID (for company-scoped roles)' })
  @IsUUID()
  @IsOptional()
  company_id?: string;
}

export class RevokeRoleDto {
  @ApiProperty({ description: 'User ID to revoke role from' })
  @IsUUID()
  @IsNotEmpty()
  user_id!: string;

  @ApiProperty({ description: 'Role ID to revoke' })
  @IsUUID()
  @IsNotEmpty()
  role_id!: string;

  @ApiPropertyOptional({ description: 'Company ID (for company-scoped roles)' })
  @IsUUID()
  @IsOptional()
  company_id?: string;
}

export class GetUserPermissionsQueryDto {
  @ApiPropertyOptional({ description: 'Company ID to scope permissions' })
  @IsUUID()
  @IsOptional()
  company_id?: string;
}

export class CheckPermissionDto {
  @ApiProperty({ description: 'Permission to check', example: 'company:write' })
  @IsString()
  @IsNotEmpty()
  permission!: string;

  @ApiPropertyOptional({ description: 'Company ID to scope the check' })
  @IsUUID()
  @IsOptional()
  company_id?: string;
}

// ============================================================
// Response DTOs
// ============================================================

export class RoleResponseDto {
  @ApiProperty({ description: 'Role ID' })
  _id!: string;

  @ApiProperty({ description: 'Role name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Role description' })
  description?: string;

  @ApiProperty({ description: 'Role permissions', type: [String] })
  permissions!: string[];

  @ApiProperty({ description: 'Is system role' })
  is_system!: boolean;

  @ApiProperty({ description: 'Is role active' })
  is_active!: boolean;

  @ApiProperty({ description: 'Created at' })
  created_at!: Date;

  @ApiProperty({ description: 'Updated at' })
  updated_at!: Date;
}

export class UserRoleResponseDto {
  @ApiProperty({ description: 'Mapping ID' })
  _id!: string;

  @ApiProperty({ description: 'User ID' })
  user_id!: string;

  @ApiProperty({ description: 'Role ID' })
  role_id!: string;

  @ApiPropertyOptional({ description: 'Company ID' })
  company_id?: string;

  @ApiPropertyOptional({ description: 'Assigned by user ID' })
  assigned_by?: string;

  @ApiProperty({ description: 'Assigned at' })
  assigned_at!: Date;

  @ApiPropertyOptional({ description: 'Role details', type: RoleResponseDto })
  role?: RoleResponseDto;
}

// Permission enums matching frontend
export enum ENTITIES {
  COMPANY = 'company',
  USER = 'user',
  ROLE = 'role',
  LOAD = 'load',
  TRIP = 'trip',
  BOOKING = 'booking',
  TRANSPORT = 'transport',
  BOARD = 'board',
  BID = 'bid',
  CHAT = 'chat',
  NOTIFICATION = 'notification',
  BILLING = 'billing',
}

export enum PAGES {
  DASHBOARD = 'dashboard',
  LOADS = 'loads',
  TRIPS = 'trips',
  BOOKINGS = 'bookings',
  TRANSPORTS = 'transports',
  COMPANY = 'company',
  USERS = 'users',
  ROLES = 'roles',
  SETTINGS = 'settings',
  BILLING = 'billing',
  REPORTS = 'reports',
  CHAT = 'chat',
  NOTIFICATIONS = 'notifications',
}

export enum CRUD_ACTIONS {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

export class EntityPermissionDto {
  @ApiProperty({ description: 'Entity name', enum: ENTITIES })
  entity!: ENTITIES;

  @ApiProperty({ description: 'Allowed actions', enum: CRUD_ACTIONS, isArray: true })
  actions!: CRUD_ACTIONS[];
}

export class PagePermissionDto {
  @ApiProperty({ description: 'Page name', enum: PAGES })
  page!: PAGES;

  @ApiProperty({ description: 'Allowed actions', enum: CRUD_ACTIONS, isArray: true })
  actions!: CRUD_ACTIONS[];
}

export class UserPermissionsResponseDto {
  @ApiProperty({ description: 'Entity permissions', type: [EntityPermissionDto] })
  entity_permissions!: EntityPermissionDto[];

  @ApiProperty({ description: 'Page permissions', type: [PagePermissionDto] })
  page_permissions!: PagePermissionDto[];
}

export class CheckPermissionResponseDto {
  @ApiProperty({ description: 'Whether user has the permission' })
  has_permission!: boolean;

  @ApiProperty({ description: 'Permission checked' })
  permission!: string;
}
