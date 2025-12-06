import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { ROLE_REPOSITORY, IRoleRepository } from '../../ports/role.repository';

// ============================================================
// Commands
// ============================================================

export class CreateRoleCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly permissions: string[],
    public readonly description?: string,
    public readonly isSystem?: boolean
  ) {}
}

export class UpdateRoleCommand implements ICommand {
  constructor(
    public readonly roleId: string,
    public readonly name?: string,
    public readonly permissions?: string[],
    public readonly description?: string,
    public readonly isActive?: boolean
  ) {}
}

export class DeleteRoleCommand implements ICommand {
  constructor(public readonly roleId: string) {}
}

export class AssignRoleCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly roleId: string,
    public readonly companyId?: string,
    public readonly assignedBy?: string
  ) {}
}

export class RevokeRoleCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly roleId: string,
    public readonly companyId?: string
  ) {}
}

// ============================================================
// Handlers
// ============================================================

@Injectable()
@CommandHandler(CreateRoleCommand)
export class CreateRoleHandler implements ICommandHandler<CreateRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(command: CreateRoleCommand): Promise<{ id: string }> {
    const existing = await this.roleRepository.findByName(command.name);
    if (existing) {
      throw new BadRequestException(`Role with name '${command.name}' already exists`);
    }

    const id = uuidv4();
    await this.roleRepository.create({
      id,
      name: command.name,
      description: command.description,
      permissions: command.permissions,
      isSystem: command.isSystem,
    });

    return { id };
  }
}

@Injectable()
@CommandHandler(UpdateRoleCommand)
export class UpdateRoleHandler implements ICommandHandler<UpdateRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(command: UpdateRoleCommand): Promise<void> {
    const role = await this.roleRepository.findById(command.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem && (command.name || command.permissions)) {
      throw new ForbiddenException('Cannot modify name or permissions of system roles');
    }

    if (command.name && command.name !== role.name) {
      const existing = await this.roleRepository.findByName(command.name);
      if (existing) {
        throw new BadRequestException(`Role with name '${command.name}' already exists`);
      }
    }

    await this.roleRepository.update(command.roleId, {
      name: command.name,
      description: command.description,
      permissions: command.permissions,
      isActive: command.isActive,
    });
  }
}

@Injectable()
@CommandHandler(DeleteRoleCommand)
export class DeleteRoleHandler implements ICommandHandler<DeleteRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(command: DeleteRoleCommand): Promise<void> {
    const role = await this.roleRepository.findById(command.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete system roles');
    }

    await this.roleRepository.delete(command.roleId);
  }
}

@Injectable()
@CommandHandler(AssignRoleCommand)
export class AssignRoleHandler implements ICommandHandler<AssignRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(command: AssignRoleCommand): Promise<void> {
    const role = await this.roleRepository.findById(command.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (!role.isActive) {
      throw new BadRequestException('Cannot assign inactive role');
    }

    const hasRole = await this.roleRepository.hasRole(
      command.userId,
      role.name,
      command.companyId
    );

    if (hasRole) {
      throw new BadRequestException('User already has this role');
    }

    await this.roleRepository.assignRole({
      id: uuidv4(),
      userId: command.userId,
      roleId: command.roleId,
      companyId: command.companyId,
      assignedBy: command.assignedBy,
    });
  }
}

@Injectable()
@CommandHandler(RevokeRoleCommand)
export class RevokeRoleHandler implements ICommandHandler<RevokeRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository
  ) {}

  async execute(command: RevokeRoleCommand): Promise<void> {
    const role = await this.roleRepository.findById(command.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.roleRepository.revokeRole(
      command.userId,
      command.roleId,
      command.companyId
    );
  }
}

export const RoleCommandHandlers = [
  CreateRoleHandler,
  UpdateRoleHandler,
  DeleteRoleHandler,
  AssignRoleHandler,
  RevokeRoleHandler,
];
