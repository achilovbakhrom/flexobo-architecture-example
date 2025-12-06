import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ILocationService,
  LOCATION_SERVICE,
  LocationSuggestion,
} from '../../../ports/location.service';

export class AutocompleteLocationQuery implements IQuery {
  constructor(
    public readonly query: string,
    public readonly lang: string = 'en',
    public readonly limit: number = 10
  ) {}
}

@QueryHandler(AutocompleteLocationQuery)
export class AutocompleteLocationHandler
  implements IQueryHandler<AutocompleteLocationQuery, LocationSuggestion[]>
{
  constructor(
    @Inject(LOCATION_SERVICE)
    private readonly locationService: ILocationService
  ) {}

  async execute(query: AutocompleteLocationQuery): Promise<LocationSuggestion[]> {
    if (!query.query || query.query.length < 2) {
      return [];
    }

    return this.locationService.autocomplete(
      query.query,
      query.lang,
      query.limit
    );
  }
}
