import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  IBidReadRepository,
  BidReadDto,
  BidFilters,
  BID_READ_REPOSITORY,
} from '../../../ports/bid.repository';

export class ListReceivedBidsQuery implements IQuery {
  constructor(
    public readonly ownerId: string,
    public readonly filters?: BidFilters,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface ListReceivedBidsResult {
  data: BidReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
@QueryHandler(ListReceivedBidsQuery)
export class ListReceivedBidsHandler
  implements IQueryHandler<ListReceivedBidsQuery>
{
  constructor(
    @Inject(BID_READ_REPOSITORY)
    private readonly bidRepo: IBidReadRepository
  ) {}

  async execute(query: ListReceivedBidsQuery): Promise<ListReceivedBidsResult> {
    const offset = (query.page - 1) * query.limit;

    const filters: BidFilters = {
      ...query.filters,
      offset,
      limit: query.limit,
    };

    const [data, total] = await Promise.all([
      this.bidRepo.findByOwner(query.ownerId, filters),
      this.bidRepo.countByOwner(query.ownerId, query.filters),
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
