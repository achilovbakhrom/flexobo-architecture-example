import { Injectable, Inject } from '@nestjs/common';
import {
  IRoleRepository,
  RoleReadDto,
  UserRoleMappingReadDto,
} from '../../ports/role.repository';

interface RolePrismaClient {
  role: {
    findUnique: (args: { where: { id?: string; name?: string }; include?: { userRoles?: boolean } }) => Promise<RoleRecord | null>;
    findMany: (args?: { where?: { isActive?: boolean }; include?: { userRoles?: boolean } }) => Promise<RoleRecord[]>;
    create: (args: { data: CreateRoleData }) => Promise<RoleRecord>;
    update: (args: { where: { id: string }; data: UpdateRoleData }) => Promise<RoleRecord>;
    delete: (args: { where: { id: string } }) => Promise<RoleRecord>;
  };
  userRoleMapping: {
    findMany: (args: { where: { userId: string; companyId?: string | null }; include?: { role: boolean } }) => Promise<UserRoleMappingRecord[]>;
    findFirst: (args: { where: { userId: string; role?: { name: string }; companyId?: string | null }; include?: { role: boolean } }) => Promise<UserRoleMappingRecord | null>;
    create: (args: { data: CreateUserRoleMappingData }) => Promise<UserRoleMappingRecord>;
    deleteMany: (args: { where: { userId: string; roleId: string; companyId?: string | null } }) => Promise<{ count: number }>;
  };
}

interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  permissions: unknown;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserRoleMappingRecord {
  id: string;
  userId: string;
  roleId: string;
  companyId: string | null;
  assignedBy: string | null;
  assignedAt: Date;
  role?: RoleRecord;
}

interface CreateRoleData {
  id: string;
  name: string;
  description?: string;
  permissions: unknown;
  isSystem?: boolean;
}

interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: unknown;
  isActive?: boolean;
}

interface CreateUserRoleMappingData {
  id: string;
  userId: string;
  roleId: string;
  companyId?: string;
  assignedBy?: string;
}

@Injectable()
export class PrismaRoleRepository implements IRoleRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: RolePrismaClient
  ) {}

  private mapToDto(record: RoleRecord): RoleReadDto {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      permissions: Array.isArray(record.permissions) ? record.permissions as string[] : [],
      isSystem: record.isSystem,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapUserRoleToDto(record: UserRoleMappingRecord): UserRoleMappingReadDto {
    return {
      id: record.id,
      userId: record.userId,
      roleId: record.roleId,
      companyId: record.companyId,
      assignedBy: record.assignedBy,
      assignedAt: record.assignedAt,
      role: record.role ? this.mapToDto(record.role) : undefined,
    };
  }

  async findById(id: string): Promise<RoleReadDto | null> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    return role ? this.mapToDto(role) : null;
  }

  async findByName(name: string): Promise<RoleReadDto | null> {
    const role = await this.prisma.role.findUnique({ where: { name } });
    return role ? this.mapToDto(role) : null;
  }

  async findAll(includeInactive = false): Promise<RoleReadDto[]> {
    const roles = await this.prisma.role.findMany({
      where: includeInactive ? undefined : { isActive: true },
    });
    return roles.map((r) => this.mapToDto(r));
  }

  async create(data: {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    isSystem?: boolean;
  }): Promise<void> {
    await this.prisma.role.create({
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isSystem: data.isSystem ?? false,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
      isActive?: boolean;
    }
  ): Promise<void> {
    await this.prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isActive: data.isActive,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.role.delete({ where: { id } });
  }

  async findUserRoles(userId: string, companyId?: string): Promise<UserRoleMappingReadDto[]> {
    const mappings = await this.prisma.userRoleMapping.findMany({
      where: {
        userId,
        companyId: companyId ?? null,
      },
      include: { role: true },
    });
    return mappings.map((m) => this.mapUserRoleToDto(m));
  }

  async findUserPermissions(userId: string, companyId?: string): Promise<string[]> {
    const mappings = await this.prisma.userRoleMapping.findMany({
      where: {
        userId,
        companyId: companyId ?? null,
      },
      include: { role: true },
    });

    const permissions = new Set<string>();
    for (const mapping of mappings) {
      if (mapping.role && Array.isArray(mapping.role.permissions)) {
        for (const perm of mapping.role.permissions as string[]) {
          permissions.add(perm);
        }
      }
    }

    return Array.from(permissions);
  }

  async assignRole(data: {
    id: string;
    userId: string;
    roleId: string;
    companyId?: string;
    assignedBy?: string;
  }): Promise<void> {
    await this.prisma.userRoleMapping.create({
      data: {
        id: data.id,
        userId: data.userId,
        roleId: data.roleId,
        companyId: data.companyId,
        assignedBy: data.assignedBy,
      },
    });
  }

  async revokeRole(userId: string, roleId: string, companyId?: string): Promise<void> {
    await this.prisma.userRoleMapping.deleteMany({
      where: {
        userId,
        roleId,
        companyId: companyId ?? null,
      },
    });
  }

  async hasRole(userId: string, roleName: string, companyId?: string): Promise<boolean> {
    const mapping = await this.prisma.userRoleMapping.findFirst({
      where: {
        userId,
        role: { name: roleName },
        companyId: companyId ?? null,
      },
    });
    return mapping !== null;
  }

  async hasPermission(userId: string, permission: string, companyId?: string): Promise<boolean> {
    const permissions = await this.findUserPermissions(userId, companyId);
    return permissions.includes(permission);
  }
}
