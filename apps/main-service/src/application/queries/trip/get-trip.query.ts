import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ITripReadRepository,
  TripReadDto,
  TRIP_READ_REPOSITORY,
} from '../../../ports/trip.repository';

export class GetTripQuery implements IQuery {
  constructor(public readonly tripId: string) {}
}

@Injectable()
@QueryHandler(GetTripQuery)
export class GetTripHandler implements IQueryHandler<GetTripQuery> {
  constructor(
    @Inject(TRIP_READ_REPOSITORY)
    private readonly tripRepo: ITripReadRepository
  ) {}

  async execute(query: GetTripQuery): Promise<TripReadDto> {
    const trip = await this.tripRepo.findById(query.tripId);
    if (!trip) {
      throw new NotFoundException(`Trip ${query.tripId} not found`);
    }
    return trip;
  }
}
