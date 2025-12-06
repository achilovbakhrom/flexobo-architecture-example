import { Inject, Injectable } from '@nestjs/common';
import {
  CreateLanguageInput,
  ILanguageRepository,
  LanguageDto,
  LanguageFilters,
  PaginatedLanguages,
  UpdateLanguageInput,
} from '../../../ports/language.repository';

interface PrismaLanguageClient {
  languageReadModel: {
    findMany: (args: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any | null>;
    findFirst: (args: any) => Promise<any | null>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaLanguageRepository implements ILanguageRepository {
  constructor(
    @Inject('PrismaClient')
    private readonly prisma: PrismaLanguageClient
  ) {}

  async findAll(filters?: LanguageFilters): Promise<PaginatedLanguages> {
    const {
      search,
      code,
      isActive,
      offset = 0,
      limit = 20,
    } = filters || {};

    const where = {
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
      ...(code && { code }),
      ...(isActive !== undefined && { isActive }),
    };

    const [items, total] = await Promise.all([
      this.prisma.languageReadModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.languageReadModel.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapToDto(item)),
      total,
      offset,
      limit,
    };
  }

  async findById(id: string): Promise<LanguageDto | null> {
    const language = await this.prisma.languageReadModel.findUnique({ where: { id } });
    return language ? this.mapToDto(language) : null;
  }

  async findByCode(code: string): Promise<LanguageDto | null> {
    const language = await this.prisma.languageReadModel.findFirst({
      where: { code },
    });
    return language ? this.mapToDto(language) : null;
  }

  async create(data: CreateLanguageInput): Promise<LanguageDto> {
    const language = await this.prisma.languageReadModel.create({
      data: {
        name: data.name,
        code: data.code,
        isActive: data.isActive ?? false,
      },
    });
    return this.mapToDto(language);
  }

  async update(id: string, data: UpdateLanguageInput): Promise<LanguageDto | null> {
    try {
      const language = await this.prisma.languageReadModel.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.code !== undefined && { code: data.code }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });
      return this.mapToDto(language);
    } catch (error) {
      return null;
    }
  }

  async delete(id: string): Promise<LanguageDto | null> {
    try {
      const language = await this.prisma.languageReadModel.delete({
        where: { id },
      });
      return this.mapToDto(language);
    } catch (error) {
      return null;
    }
  }

  private mapToDto(language: any): LanguageDto {
    return {
      id: language.id,
      name: language.name,
      code: language.code,
      isActive: language.isActive,
      createdAt: language.createdAt,
      updatedAt: language.updatedAt,
    };
  }
}
