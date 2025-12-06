import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';

export class ListTripsWithBidsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface TripWithBidsDto {
  id: string;
  status: string;
  price: number | null;
  currency: string | null;
  createdAt: Date;
  bidsCount: number;
  pendingBidsCount: number;
}

export interface TripsWithBidsResult {
  data: TripWithBidsDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(ListTripsWithBidsQuery)
export class ListTripsWithBidsHandler
  implements IQueryHandler<ListTripsWithBidsQuery, TripsWithBidsResult>
{
  constructor(
    @Inject('PrismaClient') private readonly prisma: any
  ) {}

  async execute(query: ListTripsWithBidsQuery): Promise<TripsWithBidsResult> {
    const offset = (query.page - 1) * query.limit;

    // Get user's trips
    const [trips, total] = await Promise.all([
      this.prisma.tripReadModel.findMany({
        where: {
          ownerId: query.userId,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: query.limit,
      }),
      this.prisma.tripReadModel.count({
        where: {
          ownerId: query.userId,
        },
      }),
    ]);

    // Get bid counts for each trip
    const tripIds = trips.map((t: any) => t.id);
    const bidCounts = await this.prisma.bidReadModel.groupBy({
      by: ['postId', 'status'],
      where: {
        postId: { in: tripIds },
        postType: 'TRIP',
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

    // Filter trips to only include those with bids
    const tripsWithBids = trips
      .filter((trip: any) => bidCountMap[trip.id]?.total > 0)
      .map((trip: any) => ({
        id: trip.id,
        status: trip.status,
        price: trip.price,
        currency: trip.currency,
        createdAt: trip.createdAt,
        bidsCount: bidCountMap[trip.id]?.total || 0,
        pendingBidsCount: bidCountMap[trip.id]?.pending || 0,
      }));

    return {
      data: tripsWithBids,
      total: tripsWithBids.length,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(tripsWithBids.length / query.limit),
    };
  }
}
