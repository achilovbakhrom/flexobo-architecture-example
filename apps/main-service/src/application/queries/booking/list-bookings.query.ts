import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  IBookingReadRepository,
  BookingReadDto,
  BookingFilters,
  BOOKING_READ_REPOSITORY,
} from '../../../ports/booking.repository';

export class ListBookingsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly role: 'customer' | 'owner' | 'both' = 'both',
    public readonly filters?: BookingFilters,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface ListBookingsResult {
  data: BookingReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
@QueryHandler(ListBookingsQuery)
export class ListBookingsHandler implements IQueryHandler<ListBookingsQuery> {
  constructor(
    @Inject(BOOKING_READ_REPOSITORY)
    private readonly bookingRepo: IBookingReadRepository
  ) {}

  async execute(query: ListBookingsQuery): Promise<ListBookingsResult> {
    const offset = (query.page - 1) * query.limit;

    const filters: BookingFilters = {
      ...query.filters,
      offset,
      limit: query.limit,
    };

    let data: BookingReadDto[] = [];
    let total = 0;

    if (query.role === 'customer') {
      [data, total] = await Promise.all([
        this.bookingRepo.findByCustomer(query.userId, filters),
        this.bookingRepo.countByCustomer(query.userId, query.filters),
      ]);
    } else if (query.role === 'owner') {
      [data, total] = await Promise.all([
        this.bookingRepo.findByOwner(query.userId, filters),
        this.bookingRepo.countByOwner(query.userId, query.filters),
      ]);
    } else {
      // Fetch both
      const [customerData, ownerData, customerCount, ownerCount] =
        await Promise.all([
          this.bookingRepo.findByCustomer(query.userId, filters),
          this.bookingRepo.findByOwner(query.userId, filters),
          this.bookingRepo.countByCustomer(query.userId, query.filters),
          this.bookingRepo.countByOwner(query.userId, query.filters),
        ]);

      // Merge and deduplicate
      const seen = new Set<string>();
      data = [...customerData, ...ownerData].filter((b) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });

      total = customerCount + ownerCount;
    }

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
