import { Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ICompanyReadRepository,
  COMPANY_READ_REPOSITORY,
} from '../../../ports/company.repository';

export class GetCompanyBookingsQuery implements IQuery {
  constructor(
    public readonly companyId: string,
    public readonly status?: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface CompanyBookingsResult {
  data: Array<{
    id: string;
    postType: string;
    postId: string;
    customerId: string;
    finalPrice: number;
    currency: string;
    status: string;
    customerRating: number | null;
    ownerRating: number | null;
    createdAt: Date;
    completedAt: Date | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BookingData {
  id: string;
  postType: string;
  postId: string;
  customerId: string;
  finalPrice: number;
  currency: string;
  status: string;
  customerRating: number | null;
  ownerRating: number | null;
  createdAt: Date;
  completedAt: Date | null;
}

@QueryHandler(GetCompanyBookingsQuery)
export class GetCompanyBookingsHandler
  implements IQueryHandler<GetCompanyBookingsQuery, CompanyBookingsResult>
{
  constructor(
    @Inject(COMPANY_READ_REPOSITORY)
    private readonly companyRepo: ICompanyReadRepository,
    @Inject('PrismaClient') private readonly prisma: any
  ) {}

  async execute(query: GetCompanyBookingsQuery): Promise<CompanyBookingsResult> {
    const company = await this.companyRepo.findById(query.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const offset = (query.page - 1) * query.limit;

    const where: Record<string, unknown> = { ownerId: company.ownerId };
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.bookingReadModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: query.limit,
      }),
      this.prisma.bookingReadModel.count({ where }),
    ]);

    return {
      data: items.map((b: BookingData) => ({
        id: b.id,
        postType: b.postType,
        postId: b.postId,
        customerId: b.customerId,
        finalPrice: b.finalPrice,
        currency: b.currency,
        status: b.status,
        customerRating: b.customerRating,
        ownerRating: b.ownerRating,
        createdAt: b.createdAt,
        completedAt: b.completedAt,
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
