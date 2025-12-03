import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IBidReadRepository,
  BidReadDto,
  BidFilters,
  BID_READ_REPOSITORY,
} from '../../../ports/bid.repository';

export class ListMyBidsQuery implements IQuery {
  constructor(
    public readonly bidderId: string,
    public readonly filters?: BidFilters,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface ListMyBidsResult {
  data: BidReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
@QueryHandler(ListMyBidsQuery)
export class ListMyBidsHandler implements IQueryHandler<ListMyBidsQuery> {
  constructor(
    @Inject(BID_READ_REPOSITORY)
    private readonly bidRepo: IBidReadRepository
  ) {}

  async execute(query: ListMyBidsQuery): Promise<ListMyBidsResult> {
    const offset = (query.page - 1) * query.limit;

    const filters: BidFilters = {
      ...query.filters,
      offset,
      limit: query.limit,
    };

    const [data, total] = await Promise.all([
      this.bidRepo.findByBidder(query.bidderId, filters),
      this.bidRepo.countByBidder(query.bidderId, query.filters),
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
