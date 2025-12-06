import { Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ICompanyReadRepository,
  COMPANY_READ_REPOSITORY,
} from '../../../ports/company.repository';

export class GetCompanyRatingsQuery implements IQuery {
  constructor(
    public readonly companyId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface CompanyRatingDto {
  bookingId: string;
  rating: number;
  comment: string | null;
  ratedBy: string;
  postType: string;
  postId: string;
  createdAt: Date;
}

export interface CompanyRatingsResult {
  ratings: CompanyRatingDto[];
  summary: {
    average: number | null;
    total: number;
    distribution: Record<number, number>; // 1-5 stars
  };
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(GetCompanyRatingsQuery)
export class GetCompanyRatingsHandler
  implements IQueryHandler<GetCompanyRatingsQuery, CompanyRatingsResult>
{
  constructor(
    @Inject(COMPANY_READ_REPOSITORY)
    private readonly companyRepo: ICompanyReadRepository,
    @Inject('PrismaClient') private readonly prisma: any
  ) {}

  async execute(query: GetCompanyRatingsQuery): Promise<CompanyRatingsResult> {
    const company = await this.companyRepo.findById(query.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const offset = (query.page - 1) * query.limit;

    const [ratingsData, totalCount, avgRating, ratingDistribution] = await Promise.all([
      // Get paginated ratings
      this.prisma.bookingReadModel.findMany({
        where: {
          ownerId: company.ownerId,
          ownerRating: { not: null },
        },
        select: {
          id: true,
          ownerRating: true,
          ownerComment: true,
          customerId: true,
          postType: true,
          postId: true,
          completedAt: true,
        },
        orderBy: { completedAt: 'desc' },
        skip: offset,
        take: query.limit,
      }),
      // Total count
      this.prisma.bookingReadModel.count({
        where: {
          ownerId: company.ownerId,
          ownerRating: { not: null },
        },
      }),
      // Average rating
      this.prisma.bookingReadModel.aggregate({
        where: {
          ownerId: company.ownerId,
          ownerRating: { not: null },
        },
        _avg: { ownerRating: true },
      }),
      // Rating distribution
      this.prisma.bookingReadModel.groupBy({
        by: ['ownerRating'],
        where: {
          ownerId: company.ownerId,
          ownerRating: { not: null },
        },
        _count: { ownerRating: true },
      }),
    ]);

    // Build distribution map
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of ratingDistribution) {
      if (item.ownerRating !== null) {
        const star = Math.round(item.ownerRating);
        distribution[star] = item._count.ownerRating;
      }
    }

    const ratings: CompanyRatingDto[] = ratingsData.map((r: { id: string; ownerRating: number | null; ownerComment: string | null; customerId: string; postType: string; postId: string; completedAt: Date | null }) => ({
      bookingId: r.id,
      rating: r.ownerRating!,
      comment: r.ownerComment,
      ratedBy: r.customerId,
      postType: r.postType,
      postId: r.postId,
      createdAt: r.completedAt || new Date(),
    }));

    return {
      ratings,
      summary: {
        average: avgRating._avg.ownerRating,
        total: totalCount,
        distribution,
      },
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(totalCount / query.limit),
    };
  }
}
