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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  JwtPayload,
  UserRole,
} from '@flexobo/shared-kernel';
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

@ApiTags('Admin - User Management')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'List all users', description: 'Retrieves a paginated list of all users in the system' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async listUsers(
    @Query() query: ListQueryParams
  ): Promise<PaginatedResult<UserDto>> {
    return this.userManagementService.listUsers(query);
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieves detailed information about a specific user' })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user-123' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getUserById(@Param('id') id: string): Promise<UserDto> {
    return this.userManagementService.getUserById(id);
  }

  /**
   * Create new user
   */
  @Post()
  @ApiOperation({ summary: 'Create new user', description: 'Creates a new user account with specified roles and permissions' })
  @ApiBody({ type: CreateUserCommand })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 409, description: 'User already exists' })
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
  @ApiOperation({ summary: 'Update user', description: 'Updates user information such as email, username, or other profile details' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserCommand })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
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
  @ApiOperation({ summary: 'Update user roles', description: 'Updates the roles assigned to a user for access control' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserRolesCommand })
  @ApiResponse({ status: 200, description: 'User roles updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid roles data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
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
  @ApiOperation({ summary: 'Delete user', description: 'Permanently deletes a user account from the system' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
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
