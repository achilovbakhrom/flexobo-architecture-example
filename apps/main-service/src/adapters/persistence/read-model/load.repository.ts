import { Injectable, Inject } from '@nestjs/common';
import {
  ILoadReadRepository,
  LoadReadDto,
  LoadFilters,
  SearchLoadFilters,
} from '../../../ports/load.repository';

interface LoadPrismaClient {
  loadReadModel: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    upsert: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaLoadReadRepository implements ILoadReadRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: LoadPrismaClient
  ) {}

  async findById(id: string): Promise<LoadReadDto | null> {
    const load = await this.prisma.loadReadModel.findUnique({
      where: { id },
    });

    return load ? this.mapToDto(load) : null;
  }

  async findByOwner(
    ownerId: string,
    filters?: LoadFilters
  ): Promise<LoadReadDto[]> {
    const { status, transportType, offset = 0, limit = 20 } = filters || {};

    const loads = await this.prisma.loadReadModel.findMany({
      where: {
        ownerId,
        ...(status && { status }),
        ...(transportType && { transportType }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return loads.map((l: any) => this.mapToDto(l));
  }

  async countByOwner(ownerId: string, filters?: LoadFilters): Promise<number> {
    const { status, transportType } = filters || {};

    return this.prisma.loadReadModel.count({
      where: {
        ownerId,
        ...(status && { status }),
        ...(transportType && { transportType }),
      },
    });
  }

  async search(filters: SearchLoadFilters): Promise<LoadReadDto[]> {
    const {
      status,
      transportType,
      fromCountry,
      toCountry,
      loadingDateFrom,
      loadingDateTo,
      boardIds = [],
      offset = 0,
      limit = 20,
    } = filters;

    // Build visibility filter: public OR belongs to user's boards
    const visibilityFilter =
      boardIds.length > 0
        ? {
            OR: [{ isPublic: true }, { boardIds: { hasSome: boardIds } }],
          }
        : { isPublic: true };

    const loads = await this.prisma.loadReadModel.findMany({
      where: {
        ...visibilityFilter,
        status: status || 'ACTIVE',
        ...(transportType && { transportType }),
        ...(fromCountry && { fromCountry }),
        ...(toCountry && { toCountry }),
        ...(loadingDateFrom && { loadingDate: { gte: loadingDateFrom } }),
        ...(loadingDateTo && { loadingDate: { lte: loadingDateTo } }),
      },
      orderBy: { loadingDate: 'asc' },
      skip: offset,
      take: limit,
    });

    return loads.map((l: any) => this.mapToDto(l));
  }

  async countSearch(filters: SearchLoadFilters): Promise<number> {
    const {
      status,
      transportType,
      fromCountry,
      toCountry,
      loadingDateFrom,
      loadingDateTo,
      boardIds = [],
    } = filters;

    const visibilityFilter =
      boardIds.length > 0
        ? {
            OR: [{ isPublic: true }, { boardIds: { hasSome: boardIds } }],
          }
        : { isPublic: true };

    return this.prisma.loadReadModel.count({
      where: {
        ...visibilityFilter,
        status: status || 'ACTIVE',
        ...(transportType && { transportType }),
        ...(fromCountry && { fromCountry }),
        ...(toCountry && { toCountry }),
        ...(loadingDateFrom && { loadingDate: { gte: loadingDateFrom } }),
        ...(loadingDateTo && { loadingDate: { lte: loadingDateTo } }),
      },
    });
  }

  async save(load: LoadReadDto): Promise<void> {
    await this.prisma.loadReadModel.upsert({
      where: { id: load.id },
      create: {
        id: load.id,
        ownerId: load.ownerId,
        companyId: load.companyId,
        status: load.status,
        fromCountry: load.fromCountry,
        fromCity: load.fromCity,
        fromAddress: load.fromAddress,
        fromLat: load.fromLat,
        fromLng: load.fromLng,
        toCountry: load.toCountry,
        toCity: load.toCity,
        toAddress: load.toAddress,
        toLat: load.toLat,
        toLng: load.toLng,
        transportType: load.transportType,
        loadingTypes: load.loadingTypes,
        cargos: load.cargos,
        totalWeight: load.totalWeight,
        totalVolume: load.totalVolume,
        features: load.features,
        adrClasses: load.adrClasses,
        temperatureMin: load.temperatureMin,
        temperatureMax: load.temperatureMax,
        price: load.price,
        currency: load.currency,
        paymentTerms: load.paymentTerms,
        loadingDate: load.loadingDate,
        loadingDateTo: load.loadingDateTo,
        unloadingDate: load.unloadingDate,
        boardIds: load.boardIds,
        isPublic: load.isPublic,
        version: load.version,
      },
      update: {
        status: load.status,
        fromCountry: load.fromCountry,
        fromCity: load.fromCity,
        fromAddress: load.fromAddress,
        fromLat: load.fromLat,
        fromLng: load.fromLng,
        toCountry: load.toCountry,
        toCity: load.toCity,
        toAddress: load.toAddress,
        toLat: load.toLat,
        toLng: load.toLng,
        transportType: load.transportType,
        loadingTypes: load.loadingTypes,
        cargos: load.cargos,
        totalWeight: load.totalWeight,
        totalVolume: load.totalVolume,
        features: load.features,
        adrClasses: load.adrClasses,
        temperatureMin: load.temperatureMin,
        temperatureMax: load.temperatureMax,
        price: load.price,
        currency: load.currency,
        paymentTerms: load.paymentTerms,
        loadingDate: load.loadingDate,
        loadingDateTo: load.loadingDateTo,
        unloadingDate: load.unloadingDate,
        boardIds: load.boardIds,
        isPublic: load.isPublic,
        version: load.version,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.loadReadModel.delete({
      where: { id },
    });
  }

  private mapToDto(load: any): LoadReadDto {
    return {
      id: load.id,
      ownerId: load.ownerId,
      companyId: load.companyId,
      status: load.status,
      fromCountry: load.fromCountry,
      fromCity: load.fromCity,
      fromAddress: load.fromAddress,
      fromLat: load.fromLat,
      fromLng: load.fromLng,
      toCountry: load.toCountry,
      toCity: load.toCity,
      toAddress: load.toAddress,
      toLat: load.toLat,
      toLng: load.toLng,
      transportType: load.transportType,
      loadingTypes: load.loadingTypes,
      cargos: load.cargos,
      totalWeight: load.totalWeight,
      totalVolume: load.totalVolume,
      features: load.features,
      adrClasses: load.adrClasses,
      temperatureMin: load.temperatureMin,
      temperatureMax: load.temperatureMax,
      price: load.price,
      currency: load.currency,
      paymentTerms: load.paymentTerms,
      loadingDate: load.loadingDate,
      loadingDateTo: load.loadingDateTo,
      unloadingDate: load.unloadingDate,
      boardIds: load.boardIds,
      isPublic: load.isPublic,
      version: load.version,
      createdAt: load.createdAt,
      updatedAt: load.updatedAt,
    };
  }
}
