import { Injectable, Inject } from '@nestjs/common';
import {
  ISavedSearchReadRepository,
  SavedSearchReadDto,
  SavedSearchFilters,
} from '../../../ports/saved-search.repository';

interface SavedSearchPrismaClient {
  savedSearchReadModel: {
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
export class PrismaSavedSearchReadRepository implements ISavedSearchReadRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: SavedSearchPrismaClient
  ) {}

  async findById(id: string): Promise<SavedSearchReadDto | null> {
    const search = await this.prisma.savedSearchReadModel.findUnique({
      where: { id },
    });

    return search ? this.mapToDto(search) : null;
  }

  async findByUser(
    userId: string,
    filters?: SavedSearchFilters
  ): Promise<SavedSearchReadDto[]> {
    const { searchType, isActive, notifyOnNew, offset = 0, limit = 20 } = filters || {};

    const searches = await this.prisma.savedSearchReadModel.findMany({
      where: {
        userId,
        ...(searchType && { searchType }),
        ...(isActive !== undefined && { isActive }),
        ...(notifyOnNew !== undefined && { notifyOnNew }),
      },
      orderBy: [
        { lastUsedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: offset,
      take: limit,
    });

    return searches.map((s: any) => this.mapToDto(s));
  }

  async countByUser(userId: string, filters?: SavedSearchFilters): Promise<number> {
    const { searchType, isActive, notifyOnNew } = filters || {};

    return this.prisma.savedSearchReadModel.count({
      where: {
        userId,
        ...(searchType && { searchType }),
        ...(isActive !== undefined && { isActive }),
        ...(notifyOnNew !== undefined && { notifyOnNew }),
      },
    });
  }

  async save(search: SavedSearchReadDto): Promise<void> {
    await this.prisma.savedSearchReadModel.upsert({
      where: { id: search.id },
      create: {
        id: search.id,
        userId: search.userId,
        name: search.name,
        searchType: search.searchType,
        filters: search.filters,
        notifyOnNew: search.notifyOnNew,
        isActive: search.isActive,
        lastUsedAt: search.lastUsedAt,
        version: search.version,
      },
      update: {
        name: search.name,
        filters: search.filters,
        notifyOnNew: search.notifyOnNew,
        isActive: search.isActive,
        lastUsedAt: search.lastUsedAt,
        version: search.version,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.savedSearchReadModel.delete({
      where: { id },
    });
  }

  private mapToDto(search: any): SavedSearchReadDto {
    return {
      id: search.id,
      userId: search.userId,
      name: search.name,
      searchType: search.searchType,
      filters: search.filters,
      notifyOnNew: search.notifyOnNew,
      isActive: search.isActive,
      lastUsedAt: search.lastUsedAt,
      version: search.version ?? 1,
      createdAt: search.createdAt,
      updatedAt: search.updatedAt,
    };
  }
}
