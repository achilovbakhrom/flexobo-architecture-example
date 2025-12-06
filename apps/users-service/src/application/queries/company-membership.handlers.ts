import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler, IQuery, IQueryHandler } from '@nestjs/cqrs';
import {
  COMPANY_MEMBERSHIP_REPOSITORY,
  ICompanyMembershipRepository,
  CompanyMembershipReadDto,
} from '../../ports/company-membership.repository';

// ============================================================
// Queries
// ============================================================

export class GetUserCompaniesQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly activeOnly?: boolean
  ) {}
}

export class GetCompanyMembersQuery implements IQuery {
  constructor(
    public readonly companyId: string,
    public readonly activeOnly?: boolean
  ) {}
}

export class GetUserDefaultCompanyQuery implements IQuery {
  constructor(public readonly userId: string) {}
}

export class GetUserMembershipQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly companyId: string
  ) {}
}

// ============================================================
// Handlers
// ============================================================

@Injectable()
@QueryHandler(GetUserCompaniesQuery)
export class GetUserCompaniesHandler
  implements IQueryHandler<GetUserCompaniesQuery, CompanyMembershipReadDto[]>
{
  constructor(
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: ICompanyMembershipRepository
  ) {}

  async execute(query: GetUserCompaniesQuery): Promise<CompanyMembershipReadDto[]> {
    return this.membershipRepository.findByUser(query.userId, query.activeOnly ?? true);
  }
}

@Injectable()
@QueryHandler(GetCompanyMembersQuery)
export class GetCompanyMembersHandler
  implements IQueryHandler<GetCompanyMembersQuery, CompanyMembershipReadDto[]>
{
  constructor(
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: ICompanyMembershipRepository
  ) {}

  async execute(query: GetCompanyMembersQuery): Promise<CompanyMembershipReadDto[]> {
    return this.membershipRepository.findByCompany(
      query.companyId,
      query.activeOnly ?? true
    );
  }
}

@Injectable()
@QueryHandler(GetUserDefaultCompanyQuery)
export class GetUserDefaultCompanyHandler
  implements IQueryHandler<GetUserDefaultCompanyQuery, CompanyMembershipReadDto | null>
{
  constructor(
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: ICompanyMembershipRepository
  ) {}

  async execute(query: GetUserDefaultCompanyQuery): Promise<CompanyMembershipReadDto | null> {
    return this.membershipRepository.findDefaultForUser(query.userId);
  }
}

@Injectable()
@QueryHandler(GetUserMembershipQuery)
export class GetUserMembershipHandler
  implements IQueryHandler<GetUserMembershipQuery, CompanyMembershipReadDto | null>
{
  constructor(
    @Inject(COMPANY_MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: ICompanyMembershipRepository
  ) {}

  async execute(query: GetUserMembershipQuery): Promise<CompanyMembershipReadDto | null> {
    return this.membershipRepository.findByUserAndCompany(query.userId, query.companyId);
  }
}

export const CompanyMembershipQueryHandlers = [
  GetUserCompaniesHandler,
  GetCompanyMembersHandler,
  GetUserDefaultCompanyHandler,
  GetUserMembershipHandler,
];
