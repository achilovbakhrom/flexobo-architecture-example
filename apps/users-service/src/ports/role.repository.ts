export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface RoleReadDto {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRoleMappingReadDto {
  id: string;
  userId: string;
  roleId: string;
  companyId: string | null;
  assignedBy: string | null;
  assignedAt: Date;
  role?: RoleReadDto;
}

export interface IRoleRepository {
  // Role CRUD
  findById(id: string): Promise<RoleReadDto | null>;
  findByName(name: string): Promise<RoleReadDto | null>;
  findAll(includeInactive?: boolean): Promise<RoleReadDto[]>;
  create(data: {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    isSystem?: boolean;
  }): Promise<void>;
  update(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
      isActive?: boolean;
    }
  ): Promise<void>;
  delete(id: string): Promise<void>;

  // User Role Mappings
  findUserRoles(userId: string, companyId?: string): Promise<UserRoleMappingReadDto[]>;
  findUserPermissions(userId: string, companyId?: string): Promise<string[]>;
  assignRole(data: {
    id: string;
    userId: string;
    roleId: string;
    companyId?: string;
    assignedBy?: string;
  }): Promise<void>;
  revokeRole(userId: string, roleId: string, companyId?: string): Promise<void>;
  hasRole(userId: string, roleName: string, companyId?: string): Promise<boolean>;
  hasPermission(userId: string, permission: string, companyId?: string): Promise<boolean>;
}
