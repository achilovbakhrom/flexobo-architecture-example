import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler, IQuery, IQueryHandler } from '@nestjs/cqrs';
import {
  ROLE_REPOSITORY,
  IRoleRepository,
  RoleReadDto,
  UserRoleMappingReadDto,
} from '../../ports/role.repository';

// ============================================================
// Queries
// ============================================================

export class GetRoleByIdQuery implements IQuery {
  constructor(public readonly roleId: string) {}
}

export class GetRoleByNameQuery implements IQuery {
  constructor(public readonly name: string) {}
}

export class ListRolesQuery implements IQuery {
  constructor(public readonly includeInactive?: boolean) {}
}

export class GetUserRolesQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly companyId?: string
  ) {}
}

export class GetUserPermissionsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly companyId?: string
  ) {}
}

export class CheckUserRoleQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly roleName: string,
    public readonly companyId?: string
  ) {}
}

export class CheckUserPermissionQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly permission: string,
    public readonly companyId?: string
  ) {}
}

// ============================================================
// Handlers
// ============================================================

@Injectable()
@QueryHandler(GetRoleByIdQuery)
export class GetRoleByIdHandler implements IQueryHandler<GetRoleByIdQuery, RoleReadDto | null> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(query: GetRoleByIdQuery): Promise<RoleReadDto | null> {
    return this.roleRepository.findById(query.roleId);
  }
}

@Injectable()
@QueryHandler(GetRoleByNameQuery)
export class GetRoleByNameHandler
  implements IQueryHandler<GetRoleByNameQuery, RoleReadDto | null>
{
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(query: GetRoleByNameQuery): Promise<RoleReadDto | null> {
    return this.roleRepository.findByName(query.name);
  }
}

@Injectable()
@QueryHandler(ListRolesQuery)
export class ListRolesHandler implements IQueryHandler<ListRolesQuery, RoleReadDto[]> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(query: ListRolesQuery): Promise<RoleReadDto[]> {
    return this.roleRepository.findAll(query.includeInactive);
  }
}

@Injectable()
@QueryHandler(GetUserRolesQuery)
export class GetUserRolesHandler
  implements IQueryHandler<GetUserRolesQuery, UserRoleMappingReadDto[]>
{
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(query: GetUserRolesQuery): Promise<UserRoleMappingReadDto[]> {
    return this.roleRepository.findUserRoles(query.userId, query.companyId);
  }
}

@Injectable()
@QueryHandler(GetUserPermissionsQuery)
export class GetUserPermissionsHandler
  implements IQueryHandler<GetUserPermissionsQuery, string[]>
{
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(query: GetUserPermissionsQuery): Promise<string[]> {
    return this.roleRepository.findUserPermissions(query.userId, query.companyId);
  }
}

@Injectable()
@QueryHandler(CheckUserRoleQuery)
export class CheckUserRoleHandler implements IQueryHandler<CheckUserRoleQuery, boolean> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(query: CheckUserRoleQuery): Promise<boolean> {
    return this.roleRepository.hasRole(query.userId, query.roleName, query.companyId);
  }
}

@Injectable()
@QueryHandler(CheckUserPermissionQuery)
export class CheckUserPermissionHandler
  implements IQueryHandler<CheckUserPermissionQuery, boolean>
{
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(query: CheckUserPermissionQuery): Promise<boolean> {
    return this.roleRepository.hasPermission(
      query.userId,
      query.permission,
      query.companyId
    );
  }
}

export const RoleQueryHandlers = [
  GetRoleByIdHandler,
  GetRoleByNameHandler,
  ListRolesHandler,
  GetUserRolesHandler,
  GetUserPermissionsHandler,
  CheckUserRoleHandler,
  CheckUserPermissionHandler,
];
