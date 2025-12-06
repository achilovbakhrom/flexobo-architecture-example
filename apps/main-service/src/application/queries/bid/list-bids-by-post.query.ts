import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  IBidReadRepository,
  BidReadDto,
  BidFilters,
  BID_READ_REPOSITORY,
} from '../../../ports/bid.repository';

export class ListBidsByPostQuery implements IQuery {
  constructor(
    public readonly postType: string,
    public readonly postId: string,
    public readonly filters?: BidFilters,
    public readonly page = 1,
    public readonly limit = 20
  ) {}
}

export interface ListBidsByPostResult {
  data: BidReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
@QueryHandler(ListBidsByPostQuery)
export class ListBidsByPostHandler implements IQueryHandler<ListBidsByPostQuery> {
  constructor(
    @Inject(BID_READ_REPOSITORY)
    private readonly bidRepo: IBidReadRepository
  ) {}

  async execute(query: ListBidsByPostQuery): Promise<ListBidsByPostResult> {
    const offset = (query.page - 1) * query.limit;

    const filters: BidFilters = {
      ...query.filters,
      offset,
      limit: query.limit,
    };

    const [data, total] = await Promise.all([
      this.bidRepo.findByPost(query.postType, query.postId, filters),
      this.bidRepo.countByPost(query.postType, query.postId, query.filters),
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
