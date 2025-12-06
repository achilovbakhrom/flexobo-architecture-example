import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ICompanyReadRepository,
  COMPANY_READ_REPOSITORY,
  CompanyReadDto,
} from '../../../ports/company.repository';

export class GetUserCompaniesQuery implements IQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetUserCompaniesQuery)
export class GetUserCompaniesHandler
  implements IQueryHandler<GetUserCompaniesQuery, CompanyReadDto[]>
{
  constructor(
    @Inject(COMPANY_READ_REPOSITORY)
    private readonly companyRepo: ICompanyReadRepository
  ) {}

  async execute(query: GetUserCompaniesQuery): Promise<CompanyReadDto[]> {
    return this.companyRepo.findByMember(query.userId);
  }
}
