import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { Inject } from '@nestjs/common';
import {
  LOAD_READ_REPOSITORY,
  ILoadReadRepository,
  LoadReadDto,
  LoadFilters,
} from '../../../ports/load.repository';

export class ListLoadsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly filters?: LoadFilters,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface ListLoadsResult {
  items: LoadReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(ListLoadsQuery)
export class ListLoadsHandler
  implements IQueryHandler<ListLoadsQuery, ListLoadsResult>
{
  constructor(
    @Inject(LOAD_READ_REPOSITORY)
    private readonly loadRepository: ILoadReadRepository
  ) {}

  async execute(query: ListLoadsQuery): Promise<ListLoadsResult> {
    const offset = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.loadRepository.findByOwner(query.userId, {
        ...query.filters,
        offset,
        limit: query.limit,
      }),
      this.loadRepository.countByOwner(query.userId, query.filters),
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
