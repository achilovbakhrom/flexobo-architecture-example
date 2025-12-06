import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';

export class ListLoadsUserBidOnQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly status?: string, // filter by bid status
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface LoadWithUserBidDto {
  id: string;
  title: string;
  status: string;
  fromCountry: string;
  toCountry: string;
  price: number | null;
  currency: string | null;
  ownerId: string;
  createdAt: Date;
  myBid: {
    id: string;
    proposedPrice: number;
    currency: string;
    status: string;
    createdAt: Date;
  };
}

export interface LoadsUserBidOnResult {
  data: LoadWithUserBidDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(ListLoadsUserBidOnQuery)
export class ListLoadsUserBidOnHandler
  implements IQueryHandler<ListLoadsUserBidOnQuery, LoadsUserBidOnResult>
{
  constructor(
    @Inject('PrismaClient') private readonly prisma: any
  ) {}

  async execute(query: ListLoadsUserBidOnQuery): Promise<LoadsUserBidOnResult> {
    const offset = (query.page - 1) * query.limit;

    // Build bid filter
    const bidFilter: any = {
      bidderId: query.userId,
      postType: 'LOAD',
    };
    if (query.status) {
      bidFilter.status = query.status;
    }

    // Get bids made by user on loads
    const [bids, total] = await Promise.all([
      this.prisma.bidReadModel.findMany({
        where: bidFilter,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: query.limit,
      }),
      this.prisma.bidReadModel.count({ where: bidFilter }),
    ]);

    // Get load IDs
    const loadIds = bids.map((b: any) => b.postId);

    // Get load details
    const loads = await this.prisma.loadReadModel.findMany({
      where: { id: { in: loadIds } },
    });

    // Build load map
    const loadMap: Record<string, any> = {};
    for (const load of loads) {
      loadMap[load.id] = load;
    }

    // Combine bids with loads
    const loadsWithBids: LoadWithUserBidDto[] = bids
      .filter((bid: any) => loadMap[bid.postId])
      .map((bid: any) => {
        const load = loadMap[bid.postId];
        return {
          id: load.id,
          title: load.title,
          status: load.status,
          fromCountry: load.fromCountry,
          toCountry: load.toCountry,
          price: load.price,
          currency: load.currency,
          ownerId: load.ownerId,
          createdAt: load.createdAt,
          myBid: {
            id: bid.id,
            proposedPrice: bid.proposedPrice,
            currency: bid.currency,
            status: bid.status,
            createdAt: bid.createdAt,
          },
        };
      });

    return {
      data: loadsWithBids,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
