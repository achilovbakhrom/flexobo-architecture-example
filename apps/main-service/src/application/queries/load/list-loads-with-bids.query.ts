import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';

export class ListLoadsWithBidsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface LoadWithBidsDto {
  id: string;
  title: string;
  status: string;
  fromCountry: string;
  toCountry: string;
  price: number | null;
  currency: string | null;
  createdAt: Date;
  bidsCount: number;
  pendingBidsCount: number;
}

export interface LoadsWithBidsResult {
  data: LoadWithBidsDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(ListLoadsWithBidsQuery)
export class ListLoadsWithBidsHandler
  implements IQueryHandler<ListLoadsWithBidsQuery, LoadsWithBidsResult>
{
  constructor(
    @Inject('PrismaClient') private readonly prisma: any
  ) {}

  async execute(query: ListLoadsWithBidsQuery): Promise<LoadsWithBidsResult> {
    const offset = (query.page - 1) * query.limit;

    // Get user's loads that have at least one bid
    const [loads, total] = await Promise.all([
      this.prisma.loadReadModel.findMany({
        where: {
          ownerId: query.userId,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: query.limit,
      }),
      this.prisma.loadReadModel.count({
        where: {
          ownerId: query.userId,
        },
      }),
    ]);

    // Get bid counts for each load
    const loadIds = loads.map((l: any) => l.id);
    const bidCounts = await this.prisma.bidReadModel.groupBy({
      by: ['postId', 'status'],
      where: {
        postId: { in: loadIds },
        postType: 'LOAD',
      },
      _count: { id: true },
    });

    // Build bid count map
    const bidCountMap: Record<string, { total: number; pending: number }> = {};
    for (const item of bidCounts) {
      if (!bidCountMap[item.postId]) {
        bidCountMap[item.postId] = { total: 0, pending: 0 };
      }
      bidCountMap[item.postId].total += item._count.id;
      if (item.status === 'PENDING') {
        bidCountMap[item.postId].pending += item._count.id;
      }
    }

    // Filter loads to only include those with bids
    const loadsWithBids = loads
      .filter((load: any) => bidCountMap[load.id]?.total > 0)
      .map((load: any) => ({
        id: load.id,
        title: load.title,
        status: load.status,
        fromCountry: load.fromCountry,
        toCountry: load.toCountry,
        price: load.price,
        currency: load.currency,
        createdAt: load.createdAt,
        bidsCount: bidCountMap[load.id]?.total || 0,
        pendingBidsCount: bidCountMap[load.id]?.pending || 0,
      }));

    return {
      data: loadsWithBids,
      total: loadsWithBids.length,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(loadsWithBids.length / query.limit),
    };
  }
}
