import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';

interface RouteAnalyticsPrismaClient {
  loadReadModel: {
    groupBy: (args: unknown) => Promise<Array<{ fromCountry: string; toCountry: string; _count: { id: number }; _avg: { price: number | null } }>>;
  };
  tripReadModel: {
    findMany: (args: unknown) => Promise<Array<{ id: string; loadingPoints: unknown; unloadingPoints: unknown; price: number | null }>>;
  };
}

export class GetRouteAnalyticsQuery implements IQuery {
  constructor(
    public readonly fromCountry?: string,
    public readonly toCountry?: string,
    public readonly period: 'week' | 'month' | 'quarter' = 'month'
  ) {}
}

export interface RouteAnalyticsResult {
  routes: Array<{
    from: string;
    to: string;
    loadCount: number;
    tripCount: number;
    avgLoadPrice: number | null;
    avgTripPrice: number | null;
    demandSupplyRatio: number; // loads / trips
  }>;
  summary: {
    totalLoads: number;
    totalTrips: number;
    avgPrice: number | null;
    topDemandRoutes: Array<{ from: string; to: string; count: number }>;
    topSupplyRoutes: Array<{ from: string; to: string; count: number }>;
  };
}

@Injectable()
@QueryHandler(GetRouteAnalyticsQuery)
export class GetRouteAnalyticsHandler implements IQueryHandler<GetRouteAnalyticsQuery, RouteAnalyticsResult> {
  constructor(@Inject('PrismaClient') private readonly prisma: RouteAnalyticsPrismaClient) {}

  async execute(query: GetRouteAnalyticsQuery): Promise<RouteAnalyticsResult> {
    const now = new Date();
    let periodStart: Date;
    switch (query.period) {
      case 'week':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    const loadFilter: Record<string, unknown> = {
      createdAt: { gte: periodStart },
    };
    if (query.fromCountry) loadFilter['fromCountry'] = query.fromCountry;
    if (query.toCountry) loadFilter['toCountry'] = query.toCountry;

    // Get load routes grouped
    const loadRoutes = await this.prisma.loadReadModel.groupBy({
      by: ['fromCountry', 'toCountry'],
      where: loadFilter,
      _count: { id: true },
      _avg: { price: true },
    });

    // Get trip routes - we need to parse the loadingPoints and unloadingPoints JSON
    const trips = await this.prisma.tripReadModel.findMany({
      where: {
        createdAt: { gte: periodStart },
      },
      select: {
        id: true,
        loadingPoints: true,
        unloadingPoints: true,
        price: true,
      },
    });

    // Parse trips to extract route info
    const tripRouteCounts: Record<string, { count: number; prices: number[] }> = {};
    for (const trip of trips) {
      const loadingPoints = trip.loadingPoints as Array<{ country: string }> | null;
      const unloadingPoints = trip.unloadingPoints as Array<{ country: string }> | null;

      if (loadingPoints?.length && unloadingPoints?.length) {
        const fromCountry = loadingPoints[0].country;
        const toCountry = unloadingPoints[unloadingPoints.length - 1].country;
        const key = `${fromCountry}:${toCountry}`;

        if (!tripRouteCounts[key]) {
          tripRouteCounts[key] = { count: 0, prices: [] };
        }
        tripRouteCounts[key].count++;
        if (trip.price) {
          tripRouteCounts[key].prices.push(trip.price);
        }
      }
    }

    // Combine load and trip data
    const routeMap: Record<
      string,
      {
        from: string;
        to: string;
        loadCount: number;
        tripCount: number;
        loadPrices: number[];
        tripPrices: number[];
      }
    > = {};

    for (const load of loadRoutes) {
      const key = `${load.fromCountry}:${load.toCountry}`;
      if (!routeMap[key]) {
        routeMap[key] = {
          from: load.fromCountry,
          to: load.toCountry,
          loadCount: 0,
          tripCount: 0,
          loadPrices: [],
          tripPrices: [],
        };
      }
      routeMap[key].loadCount = load._count.id;
      if (load._avg.price) routeMap[key].loadPrices.push(load._avg.price);
    }

    for (const [key, data] of Object.entries(tripRouteCounts)) {
      const [from, to] = key.split(':');
      if (!routeMap[key]) {
        routeMap[key] = {
          from,
          to,
          loadCount: 0,
          tripCount: 0,
          loadPrices: [],
          tripPrices: [],
        };
      }
      routeMap[key].tripCount = data.count;
      routeMap[key].tripPrices = data.prices;
    }

    // Build result
    const routes = Object.values(routeMap).map((route) => ({
      from: route.from,
      to: route.to,
      loadCount: route.loadCount,
      tripCount: route.tripCount,
      avgLoadPrice:
        route.loadPrices.length > 0
          ? route.loadPrices.reduce((a, b) => a + b, 0) / route.loadPrices.length
          : null,
      avgTripPrice:
        route.tripPrices.length > 0
          ? route.tripPrices.reduce((a, b) => a + b, 0) / route.tripPrices.length
          : null,
      demandSupplyRatio: route.tripCount > 0 ? route.loadCount / route.tripCount : route.loadCount > 0 ? Infinity : 0,
    }));

    // Sort by total activity
    routes.sort((a, b) => b.loadCount + b.tripCount - (a.loadCount + a.tripCount));

    // Calculate summary
    const totalLoads = routes.reduce((sum, r) => sum + r.loadCount, 0);
    const totalTrips = routes.reduce((sum, r) => sum + r.tripCount, 0);
    const allPrices = routes
      .flatMap((r) => [r.avgLoadPrice, r.avgTripPrice])
      .filter((p): p is number => p !== null);
    const avgPrice = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : null;

    const topDemandRoutes = [...routes]
      .sort((a, b) => b.loadCount - a.loadCount)
      .slice(0, 5)
      .map((r) => ({ from: r.from, to: r.to, count: r.loadCount }));

    const topSupplyRoutes = [...routes]
      .sort((a, b) => b.tripCount - a.tripCount)
      .slice(0, 5)
      .map((r) => ({ from: r.from, to: r.to, count: r.tripCount }));

    return {
      routes: routes.slice(0, 20), // Top 20 routes
      summary: {
        totalLoads,
        totalTrips,
        avgPrice,
        topDemandRoutes,
        topSupplyRoutes,
      },
    };
  }
}
