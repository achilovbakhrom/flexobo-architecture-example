import { Injectable, Inject } from '@nestjs/common';
import {
  ITransportReadRepository,
  TransportReadDto,
  TransportFilters,
} from '../../../ports/transport.repository';

interface TransportPrismaClient {
  transportReadModel: {
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
export class PrismaTransportReadRepository implements ITransportReadRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: TransportPrismaClient
  ) {}

  async findById(id: string): Promise<TransportReadDto | null> {
    const transport = await this.prisma.transportReadModel.findUnique({
      where: { id },
    });

    return transport ? this.mapToDto(transport) : null;
  }

  async findByOwner(
    ownerId: string,
    filters?: TransportFilters
  ): Promise<TransportReadDto[]> {
    const { transportType, isActive, offset = 0, limit = 20 } = filters || {};

    const transports = await this.prisma.transportReadModel.findMany({
      where: {
        ownerId,
        ...(transportType && { transportType }),
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return transports.map((t: any) => this.mapToDto(t));
  }

  async findByIds(ids: string[]): Promise<TransportReadDto[]> {
    const transports = await this.prisma.transportReadModel.findMany({
      where: { id: { in: ids } },
    });

    return transports.map((t: any) => this.mapToDto(t));
  }

  async countByOwner(
    ownerId: string,
    filters?: TransportFilters
  ): Promise<number> {
    const { transportType, isActive } = filters || {};

    return this.prisma.transportReadModel.count({
      where: {
        ownerId,
        ...(transportType && { transportType }),
        ...(isActive !== undefined && { isActive }),
      },
    });
  }

  async save(transport: TransportReadDto): Promise<void> {
    await this.prisma.transportReadModel.upsert({
      where: { id: transport.id },
      create: {
        id: transport.id,
        ownerId: transport.ownerId,
        companyId: transport.companyId,
        transportType: transport.transportType,
        loadingTypes: transport.loadingTypes,
        capacityTons: transport.capacityTons,
        capacityM3: transport.capacityM3,
        lengthM: transport.lengthM,
        widthM: transport.widthM,
        heightM: transport.heightM,
        features: transport.features,
        adrClasses: transport.adrClasses,
        permits: transport.permits,
        isActive: transport.isActive,
        version: transport.version,
      },
      update: {
        transportType: transport.transportType,
        loadingTypes: transport.loadingTypes,
        capacityTons: transport.capacityTons,
        capacityM3: transport.capacityM3,
        lengthM: transport.lengthM,
        widthM: transport.widthM,
        heightM: transport.heightM,
        features: transport.features,
        adrClasses: transport.adrClasses,
        permits: transport.permits,
        isActive: transport.isActive,
        version: transport.version,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.transportReadModel.delete({
      where: { id },
    });
  }

  private mapToDto(transport: any): TransportReadDto {
    return {
      id: transport.id,
      ownerId: transport.ownerId,
      companyId: transport.companyId,
      transportType: transport.transportType,
      loadingTypes: transport.loadingTypes,
      capacityTons: transport.capacityTons,
      capacityM3: transport.capacityM3,
      lengthM: transport.lengthM,
      widthM: transport.widthM,
      heightM: transport.heightM,
      features: transport.features,
      adrClasses: transport.adrClasses,
      permits: transport.permits,
      isActive: transport.isActive,
      version: transport.version,
      createdAt: transport.createdAt,
      updatedAt: transport.updatedAt,
    };
  }
}
