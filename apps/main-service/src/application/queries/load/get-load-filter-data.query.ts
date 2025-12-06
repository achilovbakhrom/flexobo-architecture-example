import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';

export class GetLoadFilterDataQuery implements IQuery {
  constructor() {}
}

export interface LoadFilterData {
  transportTypes: string[];
  loadingTypes: string[];
  features: string[];
  adrClasses: string[];
  countries: { from: string[]; to: string[] };
  currencies: string[];
  priceRange: { min: number; max: number };
}

@QueryHandler(GetLoadFilterDataQuery)
export class GetLoadFilterDataHandler
  implements IQueryHandler<GetLoadFilterDataQuery, LoadFilterData>
{
  constructor(
    @Inject('PrismaClient') private readonly prisma: any
  ) {}

  async execute(_query: GetLoadFilterDataQuery): Promise<LoadFilterData> {
    // Get distinct values from loads
    const [
      transportTypes,
      loadingTypes,
      features,
      adrClasses,
      fromCountries,
      toCountries,
      currencies,
      priceStats,
    ] = await Promise.all([
      this.getDistinctTransportTypes(),
      this.getDistinctLoadingTypes(),
      this.getDistinctFeatures(),
      this.getDistinctAdrClasses(),
      this.getDistinctFromCountries(),
      this.getDistinctToCountries(),
      this.getDistinctCurrencies(),
      this.getPriceRange(),
    ]);

    return {
      transportTypes,
      loadingTypes,
      features,
      adrClasses,
      countries: {
        from: fromCountries,
        to: toCountries,
      },
      currencies,
      priceRange: priceStats,
    };
  }

  private async getDistinctTransportTypes(): Promise<string[]> {
    const result = await this.prisma.loadReadModel.findMany({
      where: { status: 'ACTIVE' },
      select: { transportType: true },
      distinct: ['transportType'],
    });
    return result.map((r: { transportType: string }) => r.transportType).filter(Boolean);
  }

  private async getDistinctLoadingTypes(): Promise<string[]> {
    const result = await this.prisma.loadReadModel.findMany({
      where: { status: 'ACTIVE' },
      select: { loadingTypes: true },
    });
    const allTypes: string[] = result.flatMap((r: { loadingTypes: string[] }) => r.loadingTypes || []);
    return [...new Set(allTypes)];
  }

  private async getDistinctFeatures(): Promise<string[]> {
    const result = await this.prisma.loadReadModel.findMany({
      where: { status: 'ACTIVE' },
      select: { features: true },
    });
    const allFeatures: string[] = result.flatMap((r: { features: string[] }) => r.features || []);
    return [...new Set(allFeatures)];
  }

  private async getDistinctAdrClasses(): Promise<string[]> {
    const result = await this.prisma.loadReadModel.findMany({
      where: { status: 'ACTIVE' },
      select: { adrClasses: true },
    });
    const allClasses: string[] = result.flatMap((r: { adrClasses: string[] }) => r.adrClasses || []);
    return [...new Set(allClasses)];
  }

  private async getDistinctFromCountries(): Promise<string[]> {
    const result = await this.prisma.loadReadModel.findMany({
      where: { status: 'ACTIVE' },
      select: { fromCountry: true },
      distinct: ['fromCountry'],
    });
    return result.map((r: { fromCountry: string }) => r.fromCountry).filter(Boolean);
  }

  private async getDistinctToCountries(): Promise<string[]> {
    const result = await this.prisma.loadReadModel.findMany({
      where: { status: 'ACTIVE' },
      select: { toCountry: true },
      distinct: ['toCountry'],
    });
    return result.map((r: { toCountry: string }) => r.toCountry).filter(Boolean);
  }

  private async getDistinctCurrencies(): Promise<string[]> {
    const result = await this.prisma.loadReadModel.findMany({
      where: { status: 'ACTIVE' },
      select: { currency: true },
      distinct: ['currency'],
    });
    return result.map((r: { currency: string }) => r.currency).filter(Boolean);
  }

  private async getPriceRange(): Promise<{ min: number; max: number }> {
    const result = await this.prisma.loadReadModel.aggregate({
      where: {
        status: 'ACTIVE',
        price: { not: null },
      },
      _min: { price: true },
      _max: { price: true },
    });
    return {
      min: result._min.price || 0,
      max: result._max.price || 0,
    };
  }
}
