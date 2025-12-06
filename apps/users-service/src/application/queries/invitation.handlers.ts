import { Inject } from '@nestjs/common';
import { QueryHandler, IQuery, IQueryHandler } from '@flexobo/core';
import {
  INVITATION_REPOSITORY,
  IInvitationRepository,
  InvitationReadDto,
  InvitationStatus,
} from '../../ports/invitation.repository';

// ============================================================
// Queries
// ============================================================

export class GetInvitationByIdQuery implements IQuery {
  constructor(public readonly invitationId: string) {}
}

export class GetInvitationByTokenQuery implements IQuery {
  constructor(public readonly token: string) {}
}

export class ListInvitationsByEmailQuery implements IQuery {
  constructor(
    public readonly email: string,
    public readonly status?: InvitationStatus
  ) {}
}

export class ListInvitationsByCompanyQuery implements IQuery {
  constructor(
    public readonly companyId: string,
    public readonly status?: InvitationStatus
  ) {}
}

// ============================================================
// Handlers
// ============================================================

@QueryHandler(GetInvitationByIdQuery)
export class GetInvitationByIdHandler
  implements IQueryHandler<GetInvitationByIdQuery, InvitationReadDto | null>
{
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository
  ) {}

  async execute(query: GetInvitationByIdQuery): Promise<InvitationReadDto | null> {
    return this.invitationRepository.findById(query.invitationId);
  }
}

@QueryHandler(GetInvitationByTokenQuery)
export class GetInvitationByTokenHandler
  implements IQueryHandler<GetInvitationByTokenQuery, InvitationReadDto | null>
{
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository
  ) {}

  async execute(query: GetInvitationByTokenQuery): Promise<InvitationReadDto | null> {
    return this.invitationRepository.findByToken(query.token);
  }
}

@QueryHandler(ListInvitationsByEmailQuery)
export class ListInvitationsByEmailHandler
  implements IQueryHandler<ListInvitationsByEmailQuery, InvitationReadDto[]>
{
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository
  ) {}

  async execute(query: ListInvitationsByEmailQuery): Promise<InvitationReadDto[]> {
    return this.invitationRepository.findByEmail(query.email, query.status);
  }
}

@QueryHandler(ListInvitationsByCompanyQuery)
export class ListInvitationsByCompanyHandler
  implements IQueryHandler<ListInvitationsByCompanyQuery, InvitationReadDto[]>
{
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository
  ) {}

  async execute(query: ListInvitationsByCompanyQuery): Promise<InvitationReadDto[]> {
    return this.invitationRepository.findByCompany(query.companyId, query.status);
  }
}

export const InvitationQueryHandlers = [
  GetInvitationByIdHandler,
  GetInvitationByTokenHandler,
  ListInvitationsByEmailHandler,
  ListInvitationsByCompanyHandler,
];
