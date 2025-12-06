import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';

interface StatsPrismaClient {
  loadReadModel: {
    groupBy: (args: unknown) => Promise<Array<{ status: string; _count: { status: number } }>>;
  };
  tripReadModel: {
    groupBy: (args: unknown) => Promise<Array<{ status: string; _count: { status: number } }>>;
  };
  bidReadModel: {
    count: (args: unknown) => Promise<number>;
  };
  bookingReadModel: {
    groupBy: (args: unknown) => Promise<Array<{ status: string; _count: { status: number } }>>;
    aggregate: (args: unknown) => Promise<{ _avg: { ownerRating: number | null } }>;
  };
  transportReadModel: {
    groupBy: (args: unknown) => Promise<Array<{ isActive: boolean; _count: { isActive: number } }>>;
  };
}

export class GetDashboardStatsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly companyId?: string
  ) {}
}

export interface DashboardStatsResult {
  loads: {
    total: number;
    active: number;
    booked: number;
    completed: number;
  };
  trips: {
    total: number;
    active: number;
    booked: number;
    completed: number;
  };
  bids: {
    sent: number;
    received: number;
    pending: number;
    accepted: number;
  };
  bookings: {
    total: number;
    inProgress: number;
    completed: number;
    averageRating: number | null;
  };
  transports: {
    total: number;
    active: number;
  };
}

@Injectable()
@QueryHandler(GetDashboardStatsQuery)
export class GetDashboardStatsHandler implements IQueryHandler<GetDashboardStatsQuery, DashboardStatsResult> {
  constructor(@Inject('PrismaClient') private readonly prisma: StatsPrismaClient) {}

  async execute(query: GetDashboardStatsQuery): Promise<DashboardStatsResult> {
    const ownerFilter = query.companyId
      ? { companyId: query.companyId }
      : { ownerId: query.userId };

    // Execute all stats queries in parallel
    const [
      loadStats,
      tripStats,
      sentBidsCount,
      receivedBidsCount,
      pendingBidsCount,
      acceptedBidsCount,
      bookingStats,
      transportStats,
      avgRating,
    ] = await Promise.all([
      // Load stats
      this.prisma.loadReadModel.groupBy({
        by: ['status'],
        where: ownerFilter,
        _count: { status: true },
      }),
      // Trip stats
      this.prisma.tripReadModel.groupBy({
        by: ['status'],
        where: ownerFilter,
        _count: { status: true },
      }),
      // Sent bids
      this.prisma.bidReadModel.count({
        where: { bidderId: query.userId },
      }),
      // Received bids
      this.prisma.bidReadModel.count({
        where: { ownerId: query.userId },
      }),
      // Pending bids (sent or received)
      this.prisma.bidReadModel.count({
        where: {
          OR: [{ bidderId: query.userId }, { ownerId: query.userId }],
          status: 'PENDING',
        },
      }),
      // Accepted bids
      this.prisma.bidReadModel.count({
        where: {
          OR: [{ bidderId: query.userId }, { ownerId: query.userId }],
          status: 'ACCEPTED',
        },
      }),
      // Booking stats
      this.prisma.bookingReadModel.groupBy({
        by: ['status'],
        where: {
          OR: [{ customerId: query.userId }, { ownerId: query.userId }],
        },
        _count: { status: true },
      }),
      // Transport stats
      this.prisma.transportReadModel.groupBy({
        by: ['isActive'],
        where: ownerFilter,
        _count: { isActive: true },
      }),
      // Average rating
      this.prisma.bookingReadModel.aggregate({
        where: {
          ownerId: query.userId,
          ownerRating: { not: null },
        },
        _avg: { ownerRating: true },
      }),
    ]);

    // Parse load stats
    const loadStatsMap: Record<string, number> = {};
    for (const item of loadStats) {
      loadStatsMap[item.status] = item._count.status;
    }

    // Parse trip stats
    const tripStatsMap: Record<string, number> = {};
    for (const item of tripStats) {
      tripStatsMap[item.status] = item._count.status;
    }

    // Parse booking stats
    const bookingStatsMap: Record<string, number> = {};
    for (const item of bookingStats) {
      bookingStatsMap[item.status] = item._count.status;
    }

    // Parse transport stats
    const transportStatsMap: Record<string, number> = {};
    for (const item of transportStats) {
      transportStatsMap[item.isActive ? 'active' : 'inactive'] = item._count.isActive;
    }

    const totalLoads =
      (loadStatsMap['DRAFT'] || 0) +
      (loadStatsMap['ACTIVE'] || 0) +
      (loadStatsMap['BOOKED'] || 0) +
      (loadStatsMap['COMPLETED'] || 0) +
      (loadStatsMap['CANCELLED'] || 0);

    const totalTrips =
      (tripStatsMap['DRAFT'] || 0) +
      (tripStatsMap['ACTIVE'] || 0) +
      (tripStatsMap['BOOKED'] || 0) +
      (tripStatsMap['COMPLETED'] || 0) +
      (tripStatsMap['CANCELLED'] || 0);

    const totalBookings = Object.values(bookingStatsMap).reduce((sum: number, count: number) => sum + count, 0);
    const totalTransports = (transportStatsMap['active'] || 0) + (transportStatsMap['inactive'] || 0);

    return {
      loads: {
        total: totalLoads,
        active: loadStatsMap['ACTIVE'] || 0,
        booked: loadStatsMap['BOOKED'] || 0,
        completed: loadStatsMap['COMPLETED'] || 0,
      },
      trips: {
        total: totalTrips,
        active: tripStatsMap['ACTIVE'] || 0,
        booked: tripStatsMap['BOOKED'] || 0,
        completed: tripStatsMap['COMPLETED'] || 0,
      },
      bids: {
        sent: sentBidsCount,
        received: receivedBidsCount,
        pending: pendingBidsCount,
        accepted: acceptedBidsCount,
      },
      bookings: {
        total: totalBookings,
        inProgress: bookingStatsMap['IN_PROGRESS'] || 0,
        completed: bookingStatsMap['COMPLETED'] || 0,
        averageRating: avgRating._avg.ownerRating,
      },
      transports: {
        total: totalTransports,
        active: transportStatsMap['active'] || 0,
      },
    };
  }
}
