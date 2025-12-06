import { Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ICompanyReadRepository,
  COMPANY_READ_REPOSITORY,
} from '../../../ports/company.repository';

export class GetCompanyStatsQuery implements IQuery {
  constructor(public readonly companyId: string) {}
}

export interface CompanyStatsResult {
  loadsPosted: number;
  tripsPosted: number;
  bookingsCompleted: number;
  activeBookings: number;
  totalRevenue: number;
  currency: string;
  averageRating: number | null;
  totalRatings: number;
  responseRate: number;
  memberCount: number;
}

@QueryHandler(GetCompanyStatsQuery)
export class GetCompanyStatsHandler
  implements IQueryHandler<GetCompanyStatsQuery, CompanyStatsResult>
{
  constructor(
    @Inject(COMPANY_READ_REPOSITORY)
    private readonly companyRepo: ICompanyReadRepository,
    @Inject('PrismaClient') private readonly prisma: any
  ) {}

  async execute(query: GetCompanyStatsQuery): Promise<CompanyStatsResult> {
    const company = await this.companyRepo.findById(query.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const [
      loadsCount,
      tripsCount,
      completedBookings,
      activeBookings,
      revenueStats,
      ratingStats,
      bidStats,
      memberCount,
    ] = await Promise.all([
      // Loads posted
      this.prisma.loadReadModel.count({
        where: { companyId: query.companyId },
      }),
      // Trips posted
      this.prisma.tripReadModel.count({
        where: { companyId: query.companyId },
      }),
      // Completed bookings
      this.prisma.bookingReadModel.count({
        where: {
          ownerId: company.ownerId,
          status: 'COMPLETED',
        },
      }),
      // Active bookings
      this.prisma.bookingReadModel.count({
        where: {
          ownerId: company.ownerId,
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      }),
      // Total revenue from completed bookings
      this.prisma.bookingReadModel.aggregate({
        where: {
          ownerId: company.ownerId,
          status: 'COMPLETED',
        },
        _sum: { finalPrice: true },
      }),
      // Ratings
      this.prisma.bookingReadModel.aggregate({
        where: {
          ownerId: company.ownerId,
          ownerRating: { not: null },
        },
        _avg: { ownerRating: true },
        _count: { ownerRating: true },
      }),
      // Bid response rate
      this.prisma.bidReadModel.groupBy({
        by: ['status'],
        where: { ownerId: company.ownerId },
        _count: { id: true },
      }),
      // Member count
      this.prisma.companyMemberReadModel.count({
        where: { companyId: query.companyId, isActive: true },
      }),
    ]);

    // Calculate response rate
    const bidStatusCounts = bidStats.reduce((acc: Record<string, number>, item: { status: string; _count: { id: number } }) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const bidCounts = Object.values(bidStatusCounts) as number[];
    const totalBidsReceived = bidCounts.reduce((a, b) => a + b, 0);
    const respondedBids = (bidStatusCounts['ACCEPTED'] || 0) +
                          (bidStatusCounts['REJECTED'] || 0) +
                          (bidStatusCounts['COUNTERED'] || 0);
    const responseRate = totalBidsReceived > 0 ? (respondedBids / totalBidsReceived) * 100 : 0;

    return {
      loadsPosted: loadsCount,
      tripsPosted: tripsCount,
      bookingsCompleted: completedBookings,
      activeBookings: activeBookings,
      totalRevenue: revenueStats._sum.finalPrice || 0,
      currency: 'USD',
      averageRating: ratingStats._avg.ownerRating,
      totalRatings: ratingStats._count.ownerRating,
      responseRate: Math.round(responseRate),
      memberCount,
    };
  }
}
