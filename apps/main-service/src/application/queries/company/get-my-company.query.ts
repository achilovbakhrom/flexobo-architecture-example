import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ICompanyReadRepository,
  COMPANY_READ_REPOSITORY,
  CompanyReadDto,
} from '../../../ports/company.repository';

export class GetMyCompanyQuery implements IQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetMyCompanyQuery)
export class GetMyCompanyHandler implements IQueryHandler<GetMyCompanyQuery, CompanyReadDto | null> {
  constructor(
    @Inject(COMPANY_READ_REPOSITORY)
    private readonly companyRepo: ICompanyReadRepository
  ) {}

  async execute(query: GetMyCompanyQuery): Promise<CompanyReadDto | null> {
    // First check if user owns a company
    const ownedCompany = await this.companyRepo.findByOwner(query.userId);
    if (ownedCompany) {
      return ownedCompany;
    }

    // Then check if user is a member of any company
    const memberCompanies = await this.companyRepo.findByMember(query.userId);
    if (memberCompanies.length > 0) {
      return memberCompanies[0]; // Return first company user is a member of
    }

    return null;
  }
}
