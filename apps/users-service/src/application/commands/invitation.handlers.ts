import { Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CommandHandler,
  ICommand,
  ICommandHandler,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import {
  INVITATION_REPOSITORY,
  IInvitationRepository,
} from '../../ports/invitation.repository';
import {
  COMPANY_MEMBERSHIP_REPOSITORY,
  ICompanyMembershipRepository,
} from '../../ports/company-membership.repository';
import { ROLE_REPOSITORY, IRoleRepository } from '../../ports/role.repository';

export class CreateInvitationCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly companyId: string,
    public readonly invitedBy: string,
    public readonly roleId?: string,
    public readonly phone?: string,
    public readonly expiresInDays?: number
  ) {}
}

export class AcceptInvitationCommand implements ICommand {
  constructor(public readonly token: string, public readonly userId: string) {}
}

export class RejectInvitationCommand implements ICommand {
  constructor(public readonly token: string) {}
}

export class RevokeInvitationCommand implements ICommand {
  constructor(
    public readonly invitationId: string,
    public readonly revokedBy: string
  ) {}
}

export class ResendInvitationCommand implements ICommand {
  constructor(
    public readonly invitationId: string,
    public readonly newExpiresInDays?: number
  ) {}
}

@CommandHandler(CreateInvitationCommand)
export class CreateInvitationHandler
  implements
    ICommandHandler<CreateInvitationCommand, { id: string; token: string }>
{
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository
  ) {}

  async execute(
    command: CreateInvitationCommand
  ): Promise<Result<{ id: string; token: string }, Error>> {
    try {
      // Check for existing pending invitation
      const existingInvitation =
        await this.invitationRepository.findPendingByEmailAndCompany(
          command.email,
          command.companyId
        );

      if (existingInvitation) {
        return new Failure(
          new BadRequestException(
            'An invitation has already been sent to this email for this company'
          )
        );
      }

      // Validate role if provided
      if (command.roleId) {
        const role = await this.roleRepository.findById(command.roleId);
        if (!role || !role.isActive) {
          return new Failure(
            new BadRequestException('Invalid or inactive role')
          );
        }
      }

      const id = uuidv4();
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + (command.expiresInDays ?? 7) * 24 * 60 * 60 * 1000
      );

      await this.invitationRepository.create({
        id,
        email: command.email,
        phone: command.phone,
        invitedBy: command.invitedBy,
        companyId: command.companyId,
        roleId: command.roleId,
        token,
        expiresAt,
      });

      return new Success({ id, token });
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

@CommandHandler(AcceptInvitationCommand)
export class AcceptInvitationHandler
  implements ICommandHandler<AcceptInvitationCommand, { companyId: string }>
{
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository,
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: ICompanyMembershipRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository
  ) {}

  async execute(
    command: AcceptInvitationCommand
  ): Promise<Result<{ companyId: string }, Error>> {
    try {
      const invitation = await this.invitationRepository.findByToken(
        command.token
      );
      if (!invitation) {
        return new Failure(new NotFoundException('Invitation not found'));
      }

      if (invitation.status !== 'PENDING') {
        return new Failure(
          new BadRequestException(
            `Invitation has already been ${invitation.status.toLowerCase()}`
          )
        );
      }

      if (new Date() > invitation.expiresAt) {
        await this.invitationRepository.updateStatus(invitation.id, 'EXPIRED');
        return new Failure(new BadRequestException('Invitation has expired'));
      }

      // Check if user is already a member
      const existingMembership =
        await this.membershipRepository.findByUserAndCompany(
          command.userId,
          invitation.companyId
        );

      if (existingMembership?.isActive) {
        return new Failure(
          new BadRequestException('User is already a member of this company')
        );
      }

      // Create membership
      const membershipId = uuidv4();
      await this.membershipRepository.create({
        id: membershipId,
        userId: command.userId,
        companyId: invitation.companyId,
        memberRole: 'MEMBER',
        isDefault: false,
      });

      // Assign role if specified
      if (invitation.roleId) {
        await this.roleRepository.assignRole({
          id: uuidv4(),
          userId: command.userId,
          roleId: invitation.roleId,
          companyId: invitation.companyId,
          assignedBy: invitation.invitedBy,
        });
      }

      // Update invitation status
      await this.invitationRepository.updateStatus(invitation.id, 'ACCEPTED', {
        acceptedAt: new Date(),
        acceptedBy: command.userId,
      });

      return new Success({ companyId: invitation.companyId });
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

@CommandHandler(RejectInvitationCommand)
export class RejectInvitationHandler
  implements ICommandHandler<RejectInvitationCommand, void>
{
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository
  ) {}

  async execute(
    command: RejectInvitationCommand
  ): Promise<Result<void, Error>> {
    try {
      const invitation = await this.invitationRepository.findByToken(
        command.token
      );
      if (!invitation) {
        return new Failure(new NotFoundException('Invitation not found'));
      }

      if (invitation.status !== 'PENDING') {
        return new Failure(
          new BadRequestException(
            `Invitation has already been ${invitation.status.toLowerCase()}`
          )
        );
      }

      await this.invitationRepository.updateStatus(invitation.id, 'REJECTED', {
        rejectedAt: new Date(),
      });

      return new Success(undefined);
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

@CommandHandler(RevokeInvitationCommand)
export class RevokeInvitationHandler
  implements ICommandHandler<RevokeInvitationCommand, void>
{
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository
  ) {}

  async execute(
    command: RevokeInvitationCommand
  ): Promise<Result<void, Error>> {
    try {
      const invitation = await this.invitationRepository.findById(
        command.invitationId
      );
      if (!invitation) {
        return new Failure(new NotFoundException('Invitation not found'));
      }

      if (invitation.status !== 'PENDING') {
        return new Failure(
          new BadRequestException('Only pending invitations can be revoked')
        );
      }

      await this.invitationRepository.updateStatus(invitation.id, 'REVOKED');

      return new Success(undefined);
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

@CommandHandler(ResendInvitationCommand)
export class ResendInvitationHandler
  implements
    ICommandHandler<
      ResendInvitationCommand,
      { token: string; expiresAt: Date }
    >
{
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository
  ) {}

  async execute(
    command: ResendInvitationCommand
  ): Promise<Result<{ token: string; expiresAt: Date }, Error>> {
    try {
      const invitation = await this.invitationRepository.findById(
        command.invitationId
      );
      if (!invitation) {
        return new Failure(new NotFoundException('Invitation not found'));
      }

      if (invitation.status !== 'PENDING' && invitation.status !== 'EXPIRED') {
        return new Failure(
          new BadRequestException(
            'Only pending or expired invitations can be resent'
          )
        );
      }

      // Delete old invitation and create new one
      await this.invitationRepository.delete(invitation.id);

      const newId = uuidv4();
      const newToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + (command.newExpiresInDays ?? 7) * 24 * 60 * 60 * 1000
      );

      await this.invitationRepository.create({
        id: newId,
        email: invitation.email,
        phone: invitation.phone ?? undefined,
        invitedBy: invitation.invitedBy,
        companyId: invitation.companyId,
        roleId: invitation.roleId ?? undefined,
        token: newToken,
        expiresAt,
      });

      return new Success({ token: newToken, expiresAt });
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

export const InvitationCommandHandlers = [
  CreateInvitationHandler,
  AcceptInvitationHandler,
  RejectInvitationHandler,
  RevokeInvitationHandler,
  ResendInvitationHandler,
];
