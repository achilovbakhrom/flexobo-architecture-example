import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';

interface MarketStatsPrismaClient {
  loadReadModel: {
    count: (args: unknown) => Promise<number>;
    aggregate: (args: unknown) => Promise<{ _avg: { price: number | null } }>;
    groupBy: (args: unknown) => Promise<Array<{ transportType: string; _count: { transportType: number } } | { fromCountry: string; toCountry: string; _count: { id: number } }>>;
  };
  tripReadModel: {
    count: (args: unknown) => Promise<number>;
    aggregate: (args: unknown) => Promise<{ _avg: { price: number | null } }>;
  };
  companyReadModel: {
    count: (args: unknown) => Promise<number>;
  };
}

export class GetMarketStatsQuery implements IQuery {
  constructor(
    public readonly period: 'day' | 'week' | 'month' = 'week'
  ) {}
}

export interface MarketStatsResult {
  period: string;
  loads: {
    total: number;
    newToday: number;
    averagePrice: number | null;
    byTransportType: Record<string, number>;
  };
  trips: {
    total: number;
    newToday: number;
    averagePrice: number | null;
  };
  popularRoutes: Array<{
    from: string;
    to: string;
    count: number;
  }>;
  activeCompanies: number;
}

@Injectable()
@QueryHandler(GetMarketStatsQuery)
export class GetMarketStatsHandler implements IQueryHandler<GetMarketStatsQuery, MarketStatsResult> {
  constructor(@Inject('PrismaClient') private readonly prisma: MarketStatsPrismaClient) {}

  async execute(query: GetMarketStatsQuery): Promise<MarketStatsResult> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let periodStart: Date;
    switch (query.period) {
      case 'day':
        periodStart = startOfDay;
        break;
      case 'week':
        periodStart = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        periodStart = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const [
      activeLoadsCount,
      newLoadsToday,
      loadAvgPrice,
      loadsByTransportType,
      activeTripsCount,
      newTripsToday,
      tripAvgPrice,
      popularRoutes,
      activeCompaniesCount,
    ] = await Promise.all([
      // Active loads
      this.prisma.loadReadModel.count({
        where: { status: 'ACTIVE' },
      }),
      // New loads today
      this.prisma.loadReadModel.count({
        where: {
          createdAt: { gte: startOfDay },
        },
      }),
      // Average load price
      this.prisma.loadReadModel.aggregate({
        where: {
          status: 'ACTIVE',
          price: { not: null },
        },
        _avg: { price: true },
      }),
      // Loads by transport type
      this.prisma.loadReadModel.groupBy({
        by: ['transportType'],
        where: {
          status: 'ACTIVE',
          createdAt: { gte: periodStart },
        },
        _count: { transportType: true },
      }),
      // Active trips
      this.prisma.tripReadModel.count({
        where: { status: 'ACTIVE' },
      }),
      // New trips today
      this.prisma.tripReadModel.count({
        where: {
          createdAt: { gte: startOfDay },
        },
      }),
      // Average trip price
      this.prisma.tripReadModel.aggregate({
        where: {
          status: 'ACTIVE',
          price: { not: null },
        },
        _avg: { price: true },
      }),
      // Popular routes (top 10)
      this.prisma.loadReadModel.groupBy({
        by: ['fromCountry', 'toCountry'],
        where: {
          createdAt: { gte: periodStart },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      // Active companies
      this.prisma.companyReadModel.count({
        where: {
          isActive: true,
          status: 'VERIFIED',
        },
      }),
    ]);

    // Transform loads by transport type
    const byTransportType: Record<string, number> = {};
    for (const item of loadsByTransportType as Array<{ transportType: string; _count: { transportType: number } }>) {
      if ('transportType' in item) {
        byTransportType[item.transportType] = item._count.transportType;
      }
    }

    // Transform popular routes
    const formattedRoutes = (popularRoutes as Array<{ fromCountry: string; toCountry: string; _count: { id: number } }>)
      .filter((route): route is { fromCountry: string; toCountry: string; _count: { id: number } } => 'fromCountry' in route)
      .map((route) => ({
        from: route.fromCountry,
        to: route.toCountry,
        count: route._count.id,
      }));

    return {
      period: query.period,
      loads: {
        total: activeLoadsCount,
        newToday: newLoadsToday,
        averagePrice: loadAvgPrice._avg.price,
        byTransportType,
      },
      trips: {
        total: activeTripsCount,
        newToday: newTripsToday,
        averagePrice: tripAvgPrice._avg.price,
      },
      popularRoutes: formattedRoutes,
      activeCompanies: activeCompaniesCount,
    };
  }
}
