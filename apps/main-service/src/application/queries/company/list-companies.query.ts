import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ICompanyReadRepository,
  COMPANY_READ_REPOSITORY,
  CompanyReadDto,
  CompanyFilters,
} from '../../../ports/company.repository';
import { CompanyType, CompanyStatus } from '../../../domain/events/company.events';

export class ListCompaniesQuery implements IQuery {
  constructor(
    public readonly filters: {
      status?: CompanyStatus;
      type?: CompanyType;
      country?: string;
      city?: string;
      isActive?: boolean;
      search?: string;
    } = {},
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface PaginatedCompaniesResult {
  data: CompanyReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
@QueryHandler(ListCompaniesQuery)
export class ListCompaniesHandler
  implements IQueryHandler<ListCompaniesQuery, PaginatedCompaniesResult>
{
  constructor(
    @Inject(COMPANY_READ_REPOSITORY)
    private readonly companyRepo: ICompanyReadRepository
  ) {}

  async execute(query: ListCompaniesQuery): Promise<PaginatedCompaniesResult> {
    const offset = (query.page - 1) * query.limit;

    const filters: CompanyFilters = {
      ...query.filters,
      offset,
      limit: query.limit,
    };

    const [data, total] = await Promise.all([
      this.companyRepo.findAll(filters),
      this.companyRepo.count(query.filters),
    ]);

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
