import { Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ICompanyReadRepository,
  COMPANY_READ_REPOSITORY,
  CompanyReadDto,
} from '../../../ports/company.repository';

export class GetCompanyQuery implements IQuery {
  constructor(public readonly companyId: string) {}
}

@QueryHandler(GetCompanyQuery)
export class GetCompanyHandler implements IQueryHandler<GetCompanyQuery, CompanyReadDto> {
  constructor(
    @Inject(COMPANY_READ_REPOSITORY)
    private readonly companyRepo: ICompanyReadRepository
  ) {}

  async execute(query: GetCompanyQuery): Promise<CompanyReadDto> {
    const company = await this.companyRepo.findById(query.companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }
}
