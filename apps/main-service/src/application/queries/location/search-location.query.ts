import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ILocationService,
  LOCATION_SERVICE,
  LocationResult,
} from '../../../ports/location.service';

export class SearchLocationQuery implements IQuery {
  constructor(
    public readonly query: string,
    public readonly country?: string,
    public readonly type?: 'city' | 'country' | 'region',
    public readonly lang: string = 'en',
    public readonly limit: number = 20
  ) {}
}

@QueryHandler(SearchLocationQuery)
export class SearchLocationHandler
  implements IQueryHandler<SearchLocationQuery, LocationResult[]>
{
  constructor(
    @Inject(LOCATION_SERVICE)
    private readonly locationService: ILocationService
  ) {}

  async execute(query: SearchLocationQuery): Promise<LocationResult[]> {
    if (!query.query || query.query.length < 2) {
      return [];
    }

    return this.locationService.search(
      query.query,
      {
        country: query.country,
        type: query.type,
        lang: query.lang,
        limit: query.limit,
      }
    );
  }
}
