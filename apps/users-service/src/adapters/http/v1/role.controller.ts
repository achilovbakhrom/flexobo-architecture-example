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
  NotFoundException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@flexobo/core';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  RevokeRoleDto,
  CheckPermissionDto,
  RoleResponseDto,
  UserRoleResponseDto,
  UserPermissionsResponseDto,
  CheckPermissionResponseDto,
  ENTITIES,
  PAGES,
  CRUD_ACTIONS,
  EntityPermissionDto,
  PagePermissionDto,
} from '../dto';
import {
  CreateRoleCommand,
  UpdateRoleCommand,
  DeleteRoleCommand,
  AssignRoleCommand,
  RevokeRoleCommand,
} from '../../../application/commands/role.handlers';
import {
  GetRoleByIdQuery,
  ListRolesQuery,
  GetUserRolesQuery,
  GetUserPermissionsQuery,
  CheckUserPermissionQuery,
} from '../../../application/queries/role.handlers';
import { JwtAuthGuard, AuthenticatedRequest } from '../guards';
import { RoleReadDto, UserRoleMappingReadDto } from '../../../ports/role.repository';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('api/v1/role')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  // ============================================================
  // Role Management
  // ============================================================

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully', type: RoleResponseDto })
  async createRole(@Body() dto: CreateRoleDto): Promise<{ data: RoleResponseDto }> {
    const command = new CreateRoleCommand(
      dto.name,
      dto.permissions,
      dto.description,
      dto.is_system
    );

    const result = await this.commandBus.execute<{ id: string }>(command);

    if (result.isFailure) {
      throw result.error;
    }

    // Fetch and return the created role
    const role = await this.queryBus.execute<RoleReadDto | null>(
      new GetRoleByIdQuery(result.value.id)
    );

    return { data: this.mapRoleToResponse(role!) };
  }

  @Get()
  @ApiOperation({ summary: 'List all roles' })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of roles', type: [RoleResponseDto] })
  async listRoles(
    @Query('include_inactive') includeInactive?: boolean
  ): Promise<{ data: RoleResponseDto[] }> {
    const roles = await this.queryBus.execute<RoleReadDto[]>(
      new ListRolesQuery(includeInactive)
    );

    return { data: roles.map(this.mapRoleToResponse) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role details', type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getRoleById(@Param('id') id: string): Promise<{ data: RoleResponseDto }> {
    const role = await this.queryBus.execute<RoleReadDto | null>(
      new GetRoleByIdQuery(id)
    );

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return { data: this.mapRoleToResponse(role) };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role updated successfully', type: RoleResponseDto })
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto
  ): Promise<{ data: RoleResponseDto }> {
    const command = new UpdateRoleCommand(
      id,
      dto.name,
      dto.permissions,
      dto.description,
      dto.is_active
    );

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }

    // Fetch and return the updated role
    const role = await this.queryBus.execute<RoleReadDto | null>(
      new GetRoleByIdQuery(id)
    );

    return { data: this.mapRoleToResponse(role!) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id') id: string): Promise<void> {
    const command = new DeleteRoleCommand(id);

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }
  }

  // ============================================================
  // User Role Assignment
  // ============================================================

  @Post('assign')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  @HttpCode(HttpStatus.OK)
  async assignRole(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AssignRoleDto
  ): Promise<{ success: boolean }> {
    const command = new AssignRoleCommand(
      dto.user_id,
      dto.role_id,
      dto.company_id,
      req.user.sub // assignedBy
    );

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { success: true };
  }

  @Post('revoke')
  @ApiOperation({ summary: 'Revoke role from user' })
  @ApiResponse({ status: 200, description: 'Role revoked successfully' })
  @HttpCode(HttpStatus.OK)
  async revokeRole(@Body() dto: RevokeRoleDto): Promise<{ success: boolean }> {
    const command = new RevokeRoleCommand(
      dto.user_id,
      dto.role_id,
      dto.company_id
    );

    const result = await this.commandBus.execute<void>(command);

    if (result.isFailure) {
      throw result.error;
    }

    return { success: true };
  }

  // ============================================================
  // User Roles & Permissions
  // ============================================================

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'company_id', required: false, description: 'Filter by company' })
  @ApiResponse({ status: 200, description: 'User roles', type: [UserRoleResponseDto] })
  async getUserRoles(
    @Param('userId') userId: string,
    @Query('company_id') companyId?: string
  ): Promise<{ data: UserRoleResponseDto[] }> {
    const roles = await this.queryBus.execute<UserRoleMappingReadDto[]>(
      new GetUserRolesQuery(userId, companyId)
    );

    return { data: roles.map(this.mapUserRoleToResponse) };
  }

  @Get('user/:userId/permissions')
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'company_id', required: false, description: 'Filter by company' })
  @ApiResponse({ status: 200, description: 'User permissions', type: UserPermissionsResponseDto })
  async getUserPermissions(
    @Param('userId') userId: string,
    @Query('company_id') companyId?: string
  ): Promise<{ data: UserPermissionsResponseDto }> {
    const permissions = await this.queryBus.execute<string[]>(
      new GetUserPermissionsQuery(userId, companyId)
    );

    return {
      data: this.transformPermissions(permissions),
    };
  }

  @Post('check-permission')
  @ApiOperation({ summary: 'Check if current user has a permission' })
  @ApiResponse({ status: 200, description: 'Permission check result', type: CheckPermissionResponseDto })
  @HttpCode(HttpStatus.OK)
  async checkPermission(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CheckPermissionDto
  ): Promise<{ data: CheckPermissionResponseDto }> {
    const hasPermission = await this.queryBus.execute<boolean>(
      new CheckUserPermissionQuery(req.user.sub, dto.permission, dto.company_id)
    );

    return {
      data: {
        has_permission: hasPermission,
        permission: dto.permission,
      },
    };
  }

  // ============================================================
  // Current User's Roles & Permissions
  // ============================================================

  @Get('me')
  @ApiOperation({ summary: 'Get current user roles' })
  @ApiQuery({ name: 'company_id', required: false, description: 'Filter by company' })
  @ApiResponse({ status: 200, description: 'Current user roles', type: [UserRoleResponseDto] })
  async getMyRoles(
    @Req() req: AuthenticatedRequest,
    @Query('company_id') companyId?: string
  ): Promise<{ data: UserRoleResponseDto[] }> {
    const roles = await this.queryBus.execute<UserRoleMappingReadDto[]>(
      new GetUserRolesQuery(req.user.sub, companyId)
    );

    return { data: roles.map(this.mapUserRoleToResponse) };
  }

  @Get('me/permissions')
  @ApiOperation({ summary: 'Get current user permissions' })
  @ApiQuery({ name: 'company_id', required: false, description: 'Filter by company' })
  @ApiResponse({ status: 200, description: 'Current user permissions', type: UserPermissionsResponseDto })
  async getMyPermissions(
    @Req() req: AuthenticatedRequest,
    @Query('company_id') companyId?: string
  ): Promise<{ data: UserPermissionsResponseDto }> {
    const permissions = await this.queryBus.execute<string[]>(
      new GetUserPermissionsQuery(req.user.sub, companyId)
    );

    return {
      data: this.transformPermissions(permissions),
    };
  }

  // ============================================================
  // Mappers
  // ============================================================

  private mapRoleToResponse(role: RoleReadDto): RoleResponseDto {
    return {
      _id: role.id,
      name: role.name,
      description: role.description ?? undefined,
      permissions: role.permissions,
      is_system: role.isSystem,
      is_active: role.isActive,
      created_at: role.createdAt,
      updated_at: role.updatedAt,
    };
  }

  private mapUserRoleToResponse(mapping: UserRoleMappingReadDto): UserRoleResponseDto {
    return {
      _id: mapping.id,
      user_id: mapping.userId,
      role_id: mapping.roleId,
      company_id: mapping.companyId ?? undefined,
      assigned_by: mapping.assignedBy ?? undefined,
      assigned_at: mapping.assignedAt,
      role: mapping.role
        ? {
            _id: mapping.role.id,
            name: mapping.role.name,
            description: mapping.role.description ?? undefined,
            permissions: mapping.role.permissions,
            is_system: mapping.role.isSystem,
            is_active: mapping.role.isActive,
            created_at: mapping.role.createdAt,
            updated_at: mapping.role.updatedAt,
          }
        : undefined,
    };
  }

  /**
   * Transform flat permission strings into structured entity and page permissions.
   * Permission format: "entity:action" (e.g., "company:read", "page:dashboard:read")
   */
  private transformPermissions(permissions: string[]): UserPermissionsResponseDto {
    const entityPermissionsMap = new Map<ENTITIES, Set<CRUD_ACTIONS>>();
    const pagePermissionsMap = new Map<PAGES, Set<CRUD_ACTIONS>>();

    // Valid entity and page values
    const validEntities = Object.values(ENTITIES);
    const validPages = Object.values(PAGES);
    const validActions = Object.values(CRUD_ACTIONS);

    for (const permission of permissions) {
      const parts = permission.toLowerCase().split(':');

      if (parts.length === 2) {
        // Format: "entity:action" (e.g., "company:read")
        const [entityOrPage, action] = parts;

        if (!validActions.includes(action as CRUD_ACTIONS)) continue;

        if (validEntities.includes(entityOrPage as ENTITIES)) {
          const entity = entityOrPage as ENTITIES;
          if (!entityPermissionsMap.has(entity)) {
            entityPermissionsMap.set(entity, new Set());
          }
          entityPermissionsMap.get(entity)!.add(action as CRUD_ACTIONS);
        }
      } else if (parts.length === 3 && parts[0] === 'page') {
        // Format: "page:pagename:action" (e.g., "page:dashboard:read")
        const [, pageName, action] = parts;

        if (!validActions.includes(action as CRUD_ACTIONS)) continue;

        if (validPages.includes(pageName as PAGES)) {
          const page = pageName as PAGES;
          if (!pagePermissionsMap.has(page)) {
            pagePermissionsMap.set(page, new Set());
          }
          pagePermissionsMap.get(page)!.add(action as CRUD_ACTIONS);
        }
      }
    }

    // Convert maps to arrays
    const entity_permissions: EntityPermissionDto[] = [];
    for (const [entity, actions] of entityPermissionsMap) {
      entity_permissions.push({
        entity,
        actions: Array.from(actions),
      });
    }

    const page_permissions: PagePermissionDto[] = [];
    for (const [page, actions] of pagePermissionsMap) {
      page_permissions.push({
        page,
        actions: Array.from(actions),
      });
    }

    return {
      entity_permissions,
      page_permissions,
    };
  }
}
