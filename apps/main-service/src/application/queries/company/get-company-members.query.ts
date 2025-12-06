import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ICompanyReadRepository,
  COMPANY_READ_REPOSITORY,
  CompanyMemberReadDto,
} from '../../../ports/company.repository';

export class GetCompanyMembersQuery implements IQuery {
  constructor(public readonly companyId: string) {}
}

@Injectable()
@QueryHandler(GetCompanyMembersQuery)
export class GetCompanyMembersHandler
  implements IQueryHandler<GetCompanyMembersQuery, CompanyMemberReadDto[]>
{
  constructor(
    @Inject(COMPANY_READ_REPOSITORY)
    private readonly companyRepo: ICompanyReadRepository
  ) {}

  async execute(query: GetCompanyMembersQuery): Promise<CompanyMemberReadDto[]> {
    const company = await this.companyRepo.findById(query.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company.members;
  }
}
