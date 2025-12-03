import { Injectable, Inject } from '@nestjs/common';
import {
  ITripReadRepository,
  TripReadDto,
  TripFilters,
  SearchTripFilters,
} from '../../../ports/trip.repository';

interface TripPrismaClient {
  tripReadModel: {
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
export class PrismaTripReadRepository implements ITripReadRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: TripPrismaClient
  ) {}

  async findById(id: string): Promise<TripReadDto | null> {
    const trip = await this.prisma.tripReadModel.findUnique({
      where: { id },
    });

    return trip ? this.mapToDto(trip) : null;
  }

  async findByOwner(
    ownerId: string,
    filters?: TripFilters
  ): Promise<TripReadDto[]> {
    const { status, offset = 0, limit = 20 } = filters || {};

    const trips = await this.prisma.tripReadModel.findMany({
      where: {
        ownerId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return trips.map((t: any) => this.mapToDto(t));
  }

  async countByOwner(ownerId: string, filters?: TripFilters): Promise<number> {
    const { status } = filters || {};

    return this.prisma.tripReadModel.count({
      where: {
        ownerId,
        ...(status && { status }),
      },
    });
  }

  async search(filters: SearchTripFilters): Promise<TripReadDto[]> {
    const {
      status,
      transportType,
      fromCountry,
      toCountry,
      dateFrom,
      dateTo,
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

    const trips = await this.prisma.tripReadModel.findMany({
      where: {
        ...visibilityFilter,
        status: status || 'ACTIVE',
        ...(transportType && {
          transport: {
            path: ['type'],
            equals: transportType,
          },
        }),
        ...(fromCountry && {
          loadingPoints: {
            path: ['$[0].country'],
            equals: fromCountry,
          },
        }),
        ...(toCountry && {
          unloadingPoints: {
            path: ['$[0].country'],
            equals: toCountry,
          },
        }),
        // Date filtering would need to be done on the first loading point date
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return trips.map((t: any) => this.mapToDto(t));
  }

  async countSearch(filters: SearchTripFilters): Promise<number> {
    const {
      status,
      transportType,
      fromCountry,
      toCountry,
      boardIds = [],
    } = filters;

    const visibilityFilter =
      boardIds.length > 0
        ? {
            OR: [{ isPublic: true }, { boardIds: { hasSome: boardIds } }],
          }
        : { isPublic: true };

    return this.prisma.tripReadModel.count({
      where: {
        ...visibilityFilter,
        status: status || 'ACTIVE',
        ...(transportType && {
          transport: {
            path: ['type'],
            equals: transportType,
          },
        }),
        ...(fromCountry && {
          loadingPoints: {
            path: ['$[0].country'],
            equals: fromCountry,
          },
        }),
        ...(toCountry && {
          unloadingPoints: {
            path: ['$[0].country'],
            equals: toCountry,
          },
        }),
      },
    });
  }

  async save(trip: TripReadDto): Promise<void> {
    await this.prisma.tripReadModel.upsert({
      where: { id: trip.id },
      create: {
        id: trip.id,
        ownerId: trip.ownerId,
        companyId: trip.companyId,
        status: trip.status,
        transport: trip.transport,
        loadingPoints: trip.loadingPoints,
        unloadingPoints: trip.unloadingPoints,
        price: trip.price,
        currency: trip.currency,
        paymentTerms: trip.paymentTerms,
        boardIds: trip.boardIds,
        isPublic: trip.isPublic,
        version: trip.version,
      },
      update: {
        status: trip.status,
        transport: trip.transport,
        loadingPoints: trip.loadingPoints,
        unloadingPoints: trip.unloadingPoints,
        price: trip.price,
        currency: trip.currency,
        paymentTerms: trip.paymentTerms,
        boardIds: trip.boardIds,
        isPublic: trip.isPublic,
        version: trip.version,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tripReadModel.delete({
      where: { id },
    });
  }

  private mapToDto(trip: any): TripReadDto {
    return {
      id: trip.id,
      ownerId: trip.ownerId,
      companyId: trip.companyId,
      status: trip.status,
      transport: trip.transport,
      loadingPoints: trip.loadingPoints,
      unloadingPoints: trip.unloadingPoints,
      price: trip.price,
      currency: trip.currency,
      paymentTerms: trip.paymentTerms,
      boardIds: trip.boardIds,
      isPublic: trip.isPublic,
      version: trip.version,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    };
  }
}
