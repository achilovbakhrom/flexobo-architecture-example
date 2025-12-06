import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { Inject } from '@nestjs/common';
import {
  LOAD_READ_REPOSITORY,
  ILoadReadRepository,
  LoadReadDto,
  SearchLoadFilters,
} from '../../../ports/load.repository';

export class SearchLoadsQuery implements IQuery {
  constructor(
    public readonly userBoardIds: string[], // Boards user has access to
    public readonly filters?: SearchLoadFilters,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface SearchLoadsResult {
  items: LoadReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(SearchLoadsQuery)
export class SearchLoadsHandler
  implements IQueryHandler<SearchLoadsQuery, SearchLoadsResult>
{
  constructor(
    @Inject(LOAD_READ_REPOSITORY)
    private readonly loadRepository: ILoadReadRepository
  ) {}

  async execute(query: SearchLoadsQuery): Promise<SearchLoadsResult> {
    const offset = (query.page - 1) * query.limit;

    const searchFilters: SearchLoadFilters = {
      ...query.filters,
      boardIds: query.userBoardIds,
      offset,
      limit: query.limit,
    };

    const [items, total] = await Promise.all([
      this.loadRepository.search(searchFilters),
      this.loadRepository.countSearch(searchFilters),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
