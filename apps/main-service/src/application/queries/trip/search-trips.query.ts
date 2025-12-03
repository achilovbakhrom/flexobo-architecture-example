import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ITripReadRepository,
  TripReadDto,
  SearchTripFilters,
  TRIP_READ_REPOSITORY,
} from '../../../ports/trip.repository';

export class SearchTripsQuery implements IQuery {
  constructor(
    public readonly userBoardIds: string[],
    public readonly filters?: Partial<SearchTripFilters>,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface SearchTripsResult {
  data: TripReadDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
@QueryHandler(SearchTripsQuery)
export class SearchTripsHandler implements IQueryHandler<SearchTripsQuery> {
  constructor(
    @Inject(TRIP_READ_REPOSITORY)
    private readonly tripRepo: ITripReadRepository
  ) {}

  async execute(query: SearchTripsQuery): Promise<SearchTripsResult> {
    const offset = (query.page - 1) * query.limit;

    const filters: SearchTripFilters = {
      ...query.filters,
      boardIds: query.userBoardIds,
      offset,
      limit: query.limit,
    };

    const [data, total] = await Promise.all([
      this.tripRepo.search(filters),
      this.tripRepo.countSearch(filters),
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
