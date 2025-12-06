import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';

export class GetTripFilterDataQuery implements IQuery {
  constructor() {}
}

export interface TripFilterData {
  transportTypes: string[];
  loadingTypes: string[];
  features: string[];
  permits: string[];
  countries: { loading: string[]; unloading: string[] };
  currencies: string[];
  priceRange: { min: number; max: number };
  capacityRange: { min: number; max: number };
}

@QueryHandler(GetTripFilterDataQuery)
export class GetTripFilterDataHandler
  implements IQueryHandler<GetTripFilterDataQuery, TripFilterData>
{
  constructor(@Inject('PrismaClient') private readonly prisma: any) {}

  async execute(_query: GetTripFilterDataQuery): Promise<TripFilterData> {
    const trips = await this.prisma.tripReadModel.findMany({
      where: { status: 'ACTIVE' },
      select: {
        transport: true,
        loadingPoints: true,
        unloadingPoints: true,
        currency: true,
        price: true,
      },
    });

    const transportTypes = new Set<string>();
    const loadingTypes = new Set<string>();
    const features = new Set<string>();
    const permits = new Set<string>();
    const loadingCountries = new Set<string>();
    const unloadingCountries = new Set<string>();
    const currencies = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = 0;
    let minCapacity = Infinity;
    let maxCapacity = 0;

    for (const trip of trips) {
      // Extract from transport JSON
      const transport = trip.transport as any;
      if (transport) {
        if (transport.type) transportTypes.add(transport.type);
        if (transport.loadingTypes) {
          transport.loadingTypes.forEach((t: string) => loadingTypes.add(t));
        }
        if (transport.features) {
          transport.features.forEach((f: string) => features.add(f));
        }
        if (transport.permits) {
          transport.permits.forEach((p: string) => permits.add(p));
        }
        if (transport.capacity) {
          minCapacity = Math.min(minCapacity, transport.capacity);
          maxCapacity = Math.max(maxCapacity, transport.capacity);
        }
      }

      // Extract countries from loading/unloading points
      const loadingPoints = trip.loadingPoints as any[];
      const unloadingPoints = trip.unloadingPoints as any[];

      if (loadingPoints) {
        loadingPoints.forEach((p) => {
          if (p.country) loadingCountries.add(p.country);
        });
      }

      if (unloadingPoints) {
        unloadingPoints.forEach((p) => {
          if (p.country) unloadingCountries.add(p.country);
        });
      }

      if (trip.currency) currencies.add(trip.currency);
      if (trip.price) {
        minPrice = Math.min(minPrice, trip.price);
        maxPrice = Math.max(maxPrice, trip.price);
      }
    }

    return {
      transportTypes: [...transportTypes],
      loadingTypes: [...loadingTypes],
      features: [...features],
      permits: [...permits],
      countries: {
        loading: [...loadingCountries],
        unloading: [...unloadingCountries],
      },
      currencies: [...currencies],
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice,
      },
      capacityRange: {
        min: minCapacity === Infinity ? 0 : minCapacity,
        max: maxCapacity,
      },
    };
  }
}
