import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ITripReadRepository,
  TripReadDto,
  TripFilters,
  TRIP_READ_REPOSITORY,
} from '../../../ports/trip.repository';

export class ListTripsQuery implements IQuery {
  constructor(
    public readonly ownerId: string,
    public readonly filters?: TripFilters,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface ListTripsResult {
  data: TripReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
@QueryHandler(ListTripsQuery)
export class ListTripsHandler implements IQueryHandler<ListTripsQuery> {
  constructor(
    @Inject(TRIP_READ_REPOSITORY)
    private readonly tripRepo: ITripReadRepository
  ) {}

  async execute(query: ListTripsQuery): Promise<ListTripsResult> {
    const offset = (query.page - 1) * query.limit;

    const filters: TripFilters = {
      ...query.filters,
      offset,
      limit: query.limit,
    };

    const [data, total] = await Promise.all([
      this.tripRepo.findByOwner(query.ownerId, filters),
      this.tripRepo.countByOwner(query.ownerId, query.filters),
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
