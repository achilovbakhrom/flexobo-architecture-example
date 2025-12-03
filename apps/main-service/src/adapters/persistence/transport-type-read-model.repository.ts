import { Injectable, Inject } from '@nestjs/common';
import {
  ITransportTypeReadModelRepository,
  TransportTypeReadModelDto,
  TransportTypeTranslationDto,
} from '../../ports/transport-type-read-model.port';
import { VersionedUpsertOptions } from '../../ports/common.port';

interface TransportTypeReadModelPrismaClient {
  transportType: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    upsert: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
  transportTypeTranslation: {
    upsert: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    deleteMany: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaTransportTypeReadModelRepository
  implements ITransportTypeReadModelRepository
{
  constructor(
    @Inject('PrismaClient')
    private readonly prisma: TransportTypeReadModelPrismaClient
  ) {}

  async findById(
    transportTypeId: string,
    language?: string
  ): Promise<TransportTypeReadModelDto | null> {
    const transportType = await this.prisma.transportType.findUnique({
      where: { id: transportTypeId },
      include: {
        translations: language
          ? { where: { language } }
          : true,
      },
    });

    return transportType ? this.mapToDto(transportType) : null;
  }

  async findAll(
    language?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransportTypeReadModelDto[]> {
    const transportTypes = await this.prisma.transportType.findMany({
      include: {
        translations: language
          ? { where: { language } }
          : true,
      },
      take: options?.limit,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });

    return transportTypes.map((tt) => this.mapToDto(tt));
  }

  async findActive(
    language?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransportTypeReadModelDto[]> {
    const transportTypes = await this.prisma.transportType.findMany({
      where: { isActive: true },
      include: {
        translations: language
          ? { where: { language } }
          : true,
      },
      take: options?.limit,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });

    return transportTypes.map((tt) => this.mapToDto(tt));
  }

  async search(
    searchTerm: string,
    language?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransportTypeReadModelDto[]> {
    const transportTypes = await this.prisma.transportType.findMany({
      where: {
        translations: {
          some: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
            ...(language && { language }),
          },
        },
      },
      include: {
        translations: language
          ? { where: { language } }
          : true,
      },
      take: options?.limit,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });

    return transportTypes.map((tt) => this.mapToDto(tt));
  }

  async upsert(
    transportType: Omit<TransportTypeReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean> {
    await this.prisma.transportType.upsert({
      where: { id: transportType.id },
      create: {
        id: transportType.id,
        isActive: transportType.isActive,
        updatedAt: transportType.updatedAt,
        version: options?.version,
        lastEventId: options?.eventId,
      },
      update: {
        isActive: transportType.isActive,
        updatedAt: transportType.updatedAt,
        version: options?.version,
        lastEventId: options?.eventId,
      },
    });

    // Upsert translations
    if (transportType.translations && transportType.translations.length > 0) {
      for (const translation of transportType.translations) {
        await this.upsertTranslation(transportType.id, translation);
      }
    }

    return true;
  }

  async upsertTranslation(
    transportTypeId: string,
    translation: {
      language: string;
      name: string;
      description?: string;
    }
  ): Promise<boolean> {
    await this.prisma.transportTypeTranslation.upsert({
      where: {
        transportTypeId_language: {
          transportTypeId,
          language: translation.language,
        },
      },
      create: {
        transportTypeId,
        language: translation.language,
        name: translation.name,
        description: translation.description,
      },
      update: {
        name: translation.name,
        description: translation.description,
      },
    });

    return true;
  }

  async deleteTranslation(
    transportTypeId: string,
    language: string
  ): Promise<boolean> {
    await this.prisma.transportTypeTranslation.delete({
      where: {
        transportTypeId_language: {
          transportTypeId,
          language,
        },
      },
    });

    return true;
  }

  async activate(transportTypeId: string): Promise<boolean> {
    await this.prisma.transportType.update({
      where: { id: transportTypeId },
      data: { isActive: true, updatedAt: new Date() },
    });

    return true;
  }

  async deactivate(transportTypeId: string): Promise<boolean> {
    await this.prisma.transportType.update({
      where: { id: transportTypeId },
      data: { isActive: false, updatedAt: new Date() },
    });

    return true;
  }

  async delete(transportTypeId: string): Promise<boolean> {
    // First delete all translations
    await this.prisma.transportTypeTranslation.deleteMany({
      where: { transportTypeId },
    });

    // Then delete the transport type
    await this.prisma.transportType.delete({
      where: { id: transportTypeId },
    });

    return true;
  }

  async softDelete(transportTypeId: string): Promise<boolean> {
    await this.prisma.transportType.update({
      where: { id: transportTypeId },
      data: { isActive: false, updatedAt: new Date() },
    });

    return true;
  }

  async count(filter?: { isActive?: boolean }): Promise<number> {
    return this.prisma.transportType.count({
      where: {
        ...(filter?.isActive !== undefined && { isActive: filter.isActive }),
      },
    });
  }

  async getTranslation(
    transportTypeId: string,
    language: string
  ): Promise<TransportTypeTranslationDto | null> {
    const translation = await this.prisma.transportTypeTranslation.findFirst({
      where: {
        transportTypeId,
        language,
      },
    });

    return translation
      ? {
          id: translation.id,
          transportTypeId: translation.transportTypeId,
          language: translation.language,
          name: translation.name,
          description: translation.description ?? undefined,
        }
      : null;
  }

  async getVersion(transportTypeId: string): Promise<number> {
    const transportType = await this.prisma.transportType.findUnique({
      where: { id: transportTypeId },
      select: { version: true },
    });

    return transportType?.version || 0;
  }

  async isEventProcessed(
    transportTypeId: string,
    eventId: string
  ): Promise<boolean> {
    const transportType = await this.prisma.transportType.findUnique({
      where: { id: transportTypeId },
      select: { lastEventId: true },
    });

    return transportType?.lastEventId === eventId;
  }

  private mapToDto(transportType: any): TransportTypeReadModelDto {
    return {
      id: transportType.id,
      isActive: transportType.isActive,
      createdAt: transportType.createdAt,
      updatedAt: transportType.updatedAt,
      translations:
        transportType.translations?.map((t: any) => ({
          id: t.id,
          transportTypeId: t.transportTypeId,
          language: t.language,
          name: t.name,
          description: t.description ?? undefined,
        })) || [],
    };
  }
}
