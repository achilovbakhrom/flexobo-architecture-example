import { Injectable, Inject } from '@nestjs/common';
import {
  ICompanyReadRepository,
  CompanyReadDto,
  CompanyMemberReadDto,
  CompanyDocumentReadDto,
  CompanyFilters,
} from '../../../ports/company.repository';
import {
  CompanyMemberRole,
  CompanyStatusHistoryItem,
} from '../../../domain/events/company.events';

interface CompanyPrismaClient {
  companyReadModel: {
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    upsert: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
  companyMemberReadModel: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    upsert: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaCompanyReadRepository implements ICompanyReadRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: CompanyPrismaClient
  ) {}

  async findById(id: string): Promise<CompanyReadDto | null> {
    const company = await this.prisma.companyReadModel.findUnique({
      where: { id },
    });

    if (!company) return null;

    const members = await this.prisma.companyMemberReadModel.findMany({
      where: { companyId: id, isActive: true },
    });

    return this.mapToDto(company, members);
  }

  async findByOwner(ownerId: string): Promise<CompanyReadDto | null> {
    const company = await this.prisma.companyReadModel.findFirst({
      where: { ownerId },
    });

    if (!company) return null;

    const members = await this.prisma.companyMemberReadModel.findMany({
      where: { companyId: company.id, isActive: true },
    });

    return this.mapToDto(company, members);
  }

  async findByMember(userId: string): Promise<CompanyReadDto[]> {
    const memberships = await this.prisma.companyMemberReadModel.findMany({
      where: { userId, isActive: true },
    });

    if (memberships.length === 0) return [];

    const companyIds = memberships.map((m: any) => m.companyId);
    const companies = await this.prisma.companyReadModel.findMany({
      where: { id: { in: companyIds } },
    });

    const result: CompanyReadDto[] = [];
    for (const company of companies) {
      const members = await this.prisma.companyMemberReadModel.findMany({
        where: { companyId: company.id, isActive: true },
      });
      result.push(this.mapToDto(company, members));
    }

    return result;
  }

  async findAll(filters?: CompanyFilters): Promise<CompanyReadDto[]> {
    const {
      status,
      verifyStatus,
      companyTypeId,
      countryId,
      city,
      search,
      offset = 0,
      limit = 20,
    } = filters || {};

    const where: any = {};

    if (status) where.status = status;
    if (verifyStatus) where.verifyStatus = verifyStatus;
    if (companyTypeId) where.companyTypeId = companyTypeId;
    if (countryId) where.countryId = countryId;
    if (city) where.city = city;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { companyDescription: { contains: search, mode: 'insensitive' } },
        { companyUniqueId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const companies = await this.prisma.companyReadModel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const result: CompanyReadDto[] = [];
    for (const company of companies) {
      const members = await this.prisma.companyMemberReadModel.findMany({
        where: { companyId: company.id, isActive: true },
      });
      result.push(this.mapToDto(company, members));
    }

    return result;
  }

  async count(filters?: CompanyFilters): Promise<number> {
    const { status, verifyStatus, companyTypeId, countryId, city, search } =
      filters || {};

    const where: any = {};

    if (status) where.status = status;
    if (verifyStatus) where.verifyStatus = verifyStatus;
    if (companyTypeId) where.companyTypeId = companyTypeId;
    if (countryId) where.countryId = countryId;
    if (city) where.city = city;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { companyDescription: { contains: search, mode: 'insensitive' } },
        { companyUniqueId: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.companyReadModel.count({ where });
  }

  async save(
    company: Omit<CompanyReadDto, 'country' | 'companyType' | 'ownerFio'>
  ): Promise<void> {
    await this.prisma.companyReadModel.upsert({
      where: { id: company.id },
      create: {
        id: company.id,
        ownerId: company.ownerId,
        companyUniqueId: company.companyUniqueId,
        companyName: company.companyName,
        companyTypeId: company.companyTypeId,
        companyDescription: company.companyDescription,
        avatar: company.avatar,
        phoneNumber: company.phoneNumber,
        email: company.email,
        countryId: company.countryId,
        city: company.city,
        dotMc: company.dotMc,
        status: company.status,
        statusHistory: company.statusHistory as any,
        verifyStatus: company.verifyStatus,
        isLegalEntity: company.isLegalEntity,
        rating: company.rating,
        countRatings: company.countRatings,
        documents: company.documents as any,
        version: company.version,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
      update: {
        ownerId: company.ownerId,
        companyUniqueId: company.companyUniqueId,
        companyName: company.companyName,
        companyTypeId: company.companyTypeId,
        companyDescription: company.companyDescription,
        avatar: company.avatar,
        phoneNumber: company.phoneNumber,
        email: company.email,
        countryId: company.countryId,
        city: company.city,
        dotMc: company.dotMc,
        status: company.status,
        statusHistory: company.statusHistory as any,
        verifyStatus: company.verifyStatus,
        isLegalEntity: company.isLegalEntity,
        rating: company.rating,
        countRatings: company.countRatings,
        documents: company.documents as any,
        version: company.version,
        updatedAt: company.updatedAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    // First delete members
    await this.prisma.companyMemberReadModel.delete({
      where: { companyId: id } as any,
    }).catch(() => {
      // Ignore if no members exist
    });

    await this.prisma.companyReadModel.delete({
      where: { id },
    });
  }

  async addMember(
    companyId: string,
    member: CompanyMemberReadDto
  ): Promise<void> {
    await this.prisma.companyMemberReadModel.upsert({
      where: { companyId_userId: { companyId, userId: member.userId } },
      create: {
        id: member.id,
        companyId,
        userId: member.userId,
        role: member.role,
        isActive: member.isActive,
        joinedAt: member.joinedAt,
      },
      update: {
        role: member.role,
        isActive: member.isActive,
      },
    });
  }

  async updateMember(
    companyId: string,
    memberId: string,
    role: CompanyMemberRole
  ): Promise<void> {
    await this.prisma.companyMemberReadModel.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async removeMember(companyId: string, memberId: string): Promise<void> {
    await this.prisma.companyMemberReadModel.update({
      where: { id: memberId },
      data: { isActive: false },
    });
  }

  private mapToDto(company: any, members: any[]): CompanyReadDto {
    // Parse JSON fields
    const statusHistory: CompanyStatusHistoryItem[] = Array.isArray(
      company.statusHistory
    )
      ? company.statusHistory
      : typeof company.statusHistory === 'string'
        ? JSON.parse(company.statusHistory)
        : [];

    const documents: CompanyDocumentReadDto[] = Array.isArray(company.documents)
      ? company.documents
      : typeof company.documents === 'string'
        ? JSON.parse(company.documents)
        : [];

    return {
      id: company.id,
      ownerId: company.ownerId,
      companyUniqueId: company.companyUniqueId,
      companyName: company.companyName,
      companyTypeId: company.companyTypeId,
      companyDescription: company.companyDescription,
      avatar: company.avatar,
      phoneNumber: company.phoneNumber,
      email: company.email,
      countryId: company.countryId,
      city: company.city,
      dotMc: company.dotMc,
      status: company.status,
      statusHistory,
      verifyStatus: company.verifyStatus,
      isLegalEntity: company.isLegalEntity ?? true,
      rating: company.rating ?? 0,
      countRatings: company.countRatings ?? 0,
      documents,
      members: (members || [])
        .filter((m: any) => m.isActive)
        .map((m: any) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          isActive: m.isActive,
          joinedAt: m.joinedAt,
        })),
      version: company.version ?? 1,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }
}
