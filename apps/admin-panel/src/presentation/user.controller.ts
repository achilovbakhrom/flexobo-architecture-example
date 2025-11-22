/**
 * User Management Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  JwtPayload,
  UserRole,
} from '@flexobo/core';
import { UserManagementService } from '../application/user-management.service';
import { AuditLogService } from '../application/audit-log.service';
import {
  CreateUserCommand,
  UpdateUserCommand,
  UpdateUserRolesCommand,
  UserDto,
  PaginatedResult,
  ListQueryParams,
} from '../domain/admin.types';

@Controller('api/v1/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UserController {
  constructor(
    private readonly userManagementService: UserManagementService,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * List all users
   */
  @Get()
  async listUsers(
    @Query() query: ListQueryParams
  ): Promise<PaginatedResult<UserDto>> {
    return this.userManagementService.listUsers(query);
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<UserDto> {
    return this.userManagementService.getUserById(id);
  }

  /**
   * Create new user
   */
  @Post()
  async createUser(
    @Body() command: CreateUserCommand,
    @CurrentUser() currentUser: JwtPayload
  ): Promise<UserDto> {
    const user = await this.userManagementService.createUser(command);

    // Create audit log
    await this.auditLogService.createAuditLog(
      currentUser.sub,
      currentUser.username || 'unknown',
      'CREATE',
      'USER',
      user.id,
      { email: user.email, username: user.username }
    );

    return user;
  }

  /**
   * Update user
   */
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() command: UpdateUserCommand,
    @CurrentUser() currentUser: JwtPayload
  ): Promise<UserDto> {
    const user = await this.userManagementService.updateUser(id, command);

    // Create audit log
    await this.auditLogService.createAuditLog(
      currentUser.sub,
      currentUser.username || 'unknown',
      'UPDATE',
      'USER',
      id,
      command as Record<string, unknown>
    );

    return user;
  }

  /**
   * Update user roles
   */
  @Put(':id/roles')
  async updateUserRoles(
    @Param('id') id: string,
    @Body() command: UpdateUserRolesCommand,
    @CurrentUser() currentUser: JwtPayload
  ): Promise<UserDto> {
    const user = await this.userManagementService.updateUserRoles(id, command);

    // Create audit log
    await this.auditLogService.createAuditLog(
      currentUser.sub,
      currentUser.username || 'unknown',
      'UPDATE_ROLES',
      'USER',
      id,
      { roles: command.roles }
    );

    return user;
  }

  /**
   * Delete user
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload
  ): Promise<void> {
    await this.userManagementService.deleteUser(id);

    // Create audit log
    await this.auditLogService.createAuditLog(
      currentUser.sub,
      currentUser.username || 'unknown',
      'DELETE',
      'USER',
      id
    );
  }
}
