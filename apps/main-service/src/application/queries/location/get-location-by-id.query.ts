import { Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ILocationService,
  LOCATION_SERVICE,
  LocationResult,
} from '../../../ports/location.service';

export class GetLocationByIdQuery implements IQuery {
  constructor(
    public readonly osmId: string,
    public readonly lang: string = 'en'
  ) {}
}

@QueryHandler(GetLocationByIdQuery)
export class GetLocationByIdHandler
  implements IQueryHandler<GetLocationByIdQuery, LocationResult>
{
  constructor(
    @Inject(LOCATION_SERVICE)
    private readonly locationService: ILocationService
  ) {}

  async execute(query: GetLocationByIdQuery): Promise<LocationResult> {
    const location = await this.locationService.getByOsmId(
      query.osmId,
      query.lang
    );

    if (!location) {
      throw new NotFoundException(`Location with OSM ID ${query.osmId} not found`);
    }

    return location;
  }
}
