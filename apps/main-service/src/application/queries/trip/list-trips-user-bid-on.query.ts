import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';

export class ListTripsUserBidOnQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly status?: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface TripWithUserBidDto {
  id: string;
  status: string;
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

export interface TripsUserBidOnResult {
  data: TripWithUserBidDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(ListTripsUserBidOnQuery)
export class ListTripsUserBidOnHandler
  implements IQueryHandler<ListTripsUserBidOnQuery, TripsUserBidOnResult>
{
  constructor(
    @Inject('PrismaClient') private readonly prisma: any
  ) {}

  async execute(query: ListTripsUserBidOnQuery): Promise<TripsUserBidOnResult> {
    const offset = (query.page - 1) * query.limit;

    // Build bid filter
    const bidFilter: any = {
      bidderId: query.userId,
      postType: 'TRIP',
    };
    if (query.status) {
      bidFilter.status = query.status;
    }

    // Get bids made by user on trips
    const [bids, total] = await Promise.all([
      this.prisma.bidReadModel.findMany({
        where: bidFilter,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: query.limit,
      }),
      this.prisma.bidReadModel.count({ where: bidFilter }),
    ]);

    // Get trip IDs
    const tripIds = bids.map((b: any) => b.postId);

    // Get trip details
    const trips = await this.prisma.tripReadModel.findMany({
      where: { id: { in: tripIds } },
    });

    // Build trip map
    const tripMap: Record<string, any> = {};
    for (const trip of trips) {
      tripMap[trip.id] = trip;
    }

    // Combine bids with trips
    const tripsWithBids: TripWithUserBidDto[] = bids
      .filter((bid: any) => tripMap[bid.postId])
      .map((bid: any) => {
        const trip = tripMap[bid.postId];
        return {
          id: trip.id,
          status: trip.status,
          price: trip.price,
          currency: trip.currency,
          ownerId: trip.ownerId,
          createdAt: trip.createdAt,
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
      data: tripsWithBids,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
