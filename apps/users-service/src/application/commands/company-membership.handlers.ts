import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import {
  COMPANY_MEMBERSHIP_REPOSITORY,
  ICompanyMembershipRepository,
  MemberRole,
} from '../../ports/company-membership.repository';

// ============================================================
// Commands
// ============================================================

export class JoinCompanyCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly companyId: string,
    public readonly memberRole: MemberRole = 'MEMBER',
    public readonly setAsDefault?: boolean
  ) {}
}

export class LeaveCompanyCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly companyId: string
  ) {}
}

export class SwitchCompanyCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly companyId: string
  ) {}
}

export class UpdateMemberRoleCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly companyId: string,
    public readonly newRole: MemberRole,
    public readonly updatedBy: string
  ) {}
}

export class RemoveMemberCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly companyId: string,
    public readonly removedBy: string
  ) {}
}

// ============================================================
// Handlers
// ============================================================

@Injectable()
@CommandHandler(JoinCompanyCommand)
export class JoinCompanyHandler implements ICommandHandler<JoinCompanyCommand> {
  constructor(
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: ICompanyMembershipRepository
  ) {}

  async execute(command: JoinCompanyCommand): Promise<{ membershipId: string }> {
    // Check for existing membership
    const existing = await this.membershipRepository.findByUserAndCompany(
      command.userId,
      command.companyId
    );

    if (existing?.isActive) {
      throw new BadRequestException('User is already a member of this company');
    }

    // Reactivate if previously left
    if (existing && !existing.isActive) {
      await this.membershipRepository.update(existing.id, {
        isActive: true,
        memberRole: command.memberRole,
        leftAt: undefined,
      });

      if (command.setAsDefault) {
        await this.membershipRepository.setDefault(command.userId, command.companyId);
      }

      return { membershipId: existing.id };
    }

    // Create new membership
    const id = uuidv4();

    // Check if this is the user's first company
    const userMemberships = await this.membershipRepository.findByUser(command.userId);
    const isFirstCompany = userMemberships.length === 0;

    await this.membershipRepository.create({
      id,
      userId: command.userId,
      companyId: command.companyId,
      memberRole: command.memberRole,
      isDefault: command.setAsDefault ?? isFirstCompany,
    });

    return { membershipId: id };
  }
}

@Injectable()
@CommandHandler(LeaveCompanyCommand)
export class LeaveCompanyHandler implements ICommandHandler<LeaveCompanyCommand> {
  constructor(
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: ICompanyMembershipRepository
  ) {}

  async execute(command: LeaveCompanyCommand): Promise<void> {
    const membership = await this.membershipRepository.findByUserAndCompany(
      command.userId,
      command.companyId
    );

    if (!membership || !membership.isActive) {
      throw new NotFoundException('User is not a member of this company');
    }

    if (membership.memberRole === 'OWNER') {
      // Check if there are other owners
      const companyMembers = await this.membershipRepository.findByCompany(command.companyId);
      const otherOwners = companyMembers.filter(
        (m) => m.memberRole === 'OWNER' && m.userId !== command.userId
      );

      if (otherOwners.length === 0) {
        throw new ForbiddenException(
          'Cannot leave company as the sole owner. Transfer ownership first.'
        );
      }
    }

    await this.membershipRepository.leave(command.userId, command.companyId);

    // If this was the default company, set another one as default
    if (membership.isDefault) {
      const remainingMemberships = await this.membershipRepository.findByUser(command.userId);
      if (remainingMemberships.length > 0) {
        await this.membershipRepository.setDefault(
          command.userId,
          remainingMemberships[0].companyId
        );
      }
    }
  }
}

@Injectable()
@CommandHandler(SwitchCompanyCommand)
export class SwitchCompanyHandler implements ICommandHandler<SwitchCompanyCommand> {
  constructor(
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: ICompanyMembershipRepository
  ) {}

  async execute(command: SwitchCompanyCommand): Promise<{ companyId: string }> {
    const membership = await this.membershipRepository.findByUserAndCompany(
      command.userId,
      command.companyId
    );

    if (!membership || !membership.isActive) {
      throw new NotFoundException('User is not a member of this company');
    }

    await this.membershipRepository.setDefault(command.userId, command.companyId);

    return { companyId: command.companyId };
  }
}

@Injectable()
@CommandHandler(UpdateMemberRoleCommand)
export class UpdateMemberRoleHandler
  implements ICommandHandler<UpdateMemberRoleCommand>
{
  constructor(
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: ICompanyMembershipRepository
  ) {}

  async execute(command: UpdateMemberRoleCommand): Promise<void> {
    const membership = await this.membershipRepository.findByUserAndCompany(
      command.userId,
      command.companyId
    );

    if (!membership || !membership.isActive) {
      throw new NotFoundException('User is not a member of this company');
    }

    // Check if updater has permission (must be OWNER or ADMIN)
    const updaterMembership = await this.membershipRepository.findByUserAndCompany(
      command.updatedBy,
      command.companyId
    );

    if (!updaterMembership || !updaterMembership.isActive) {
      throw new ForbiddenException('You are not a member of this company');
    }

    if (
      updaterMembership.memberRole !== 'OWNER' &&
      updaterMembership.memberRole !== 'ADMIN'
    ) {
      throw new ForbiddenException('Only owners and admins can update member roles');
    }

    // Only owners can promote to OWNER or ADMIN
    if (
      (command.newRole === 'OWNER' || command.newRole === 'ADMIN') &&
      updaterMembership.memberRole !== 'OWNER'
    ) {
      throw new ForbiddenException('Only owners can promote members to admin or owner');
    }

    // Cannot demote yourself if you're the only owner
    if (
      command.userId === command.updatedBy &&
      membership.memberRole === 'OWNER' &&
      command.newRole !== 'OWNER'
    ) {
      const companyMembers = await this.membershipRepository.findByCompany(command.companyId);
      const otherOwners = companyMembers.filter(
        (m) => m.memberRole === 'OWNER' && m.userId !== command.userId
      );

      if (otherOwners.length === 0) {
        throw new ForbiddenException(
          'Cannot demote yourself as the sole owner. Transfer ownership first.'
        );
      }
    }

    await this.membershipRepository.update(membership.id, {
      memberRole: command.newRole,
    });
  }
}

@Injectable()
@CommandHandler(RemoveMemberCommand)
export class RemoveMemberHandler implements ICommandHandler<RemoveMemberCommand> {
  constructor(
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: ICompanyMembershipRepository
  ) {}

  async execute(command: RemoveMemberCommand): Promise<void> {
    const membership = await this.membershipRepository.findByUserAndCompany(
      command.userId,
      command.companyId
    );

    if (!membership || !membership.isActive) {
      throw new NotFoundException('User is not a member of this company');
    }

    // Check if remover has permission
    const removerMembership = await this.membershipRepository.findByUserAndCompany(
      command.removedBy,
      command.companyId
    );

    if (!removerMembership || !removerMembership.isActive) {
      throw new ForbiddenException('You are not a member of this company');
    }

    // Only owners can remove members (admins cannot remove other admins)
    if (removerMembership.memberRole !== 'OWNER') {
      throw new ForbiddenException('Only owners can remove members');
    }

    // Cannot remove yourself
    if (command.userId === command.removedBy) {
      throw new BadRequestException('Cannot remove yourself. Use leave company instead.');
    }

    await this.membershipRepository.leave(command.userId, command.companyId);
  }
}

export const CompanyMembershipCommandHandlers = [
  JoinCompanyHandler,
  LeaveCompanyHandler,
  SwitchCompanyHandler,
  UpdateMemberRoleHandler,
  RemoveMemberHandler,
];
