import { Injectable, Inject } from '@nestjs/common';
import {
  ICompanyReadRepository,
  CompanyReadDto,
  CompanyMemberReadDto,
  CompanyFilters,
} from '../../../ports/company.repository';
import { CompanyMemberRole } from '../../../domain/events/company.events';

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
      include: { members: true },
    });

    return company ? this.mapToDto(company) : null;
  }

  async findByOwner(ownerId: string): Promise<CompanyReadDto | null> {
    const company = await this.prisma.companyReadModel.findFirst({
      where: { ownerId },
      include: { members: true },
    });

    return company ? this.mapToDto(company) : null;
  }

  async findByMember(userId: string): Promise<CompanyReadDto[]> {
    const memberships = await this.prisma.companyMemberReadModel.findMany({
      where: { userId, isActive: true },
    });

    if (memberships.length === 0) return [];

    const companyIds = memberships.map((m: any) => m.companyId);
    const companies = await this.prisma.companyReadModel.findMany({
      where: { id: { in: companyIds } },
      include: { members: true },
    });

    return companies.map((c: any) => this.mapToDto(c));
  }

  async findAll(filters?: CompanyFilters): Promise<CompanyReadDto[]> {
    const { status, type, country, city, isActive, search, offset = 0, limit = 20 } = filters || {};

    const where: any = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (country) where.country = country;
    if (city) where.city = city;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const companies = await this.prisma.companyReadModel.findMany({
      where,
      include: { members: true },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return companies.map((c: any) => this.mapToDto(c));
  }

  async count(filters?: CompanyFilters): Promise<number> {
    const { status, type, country, city, isActive, search } = filters || {};

    const where: any = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (country) where.country = country;
    if (city) where.city = city;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.companyReadModel.count({ where });
  }

  async save(company: CompanyReadDto): Promise<void> {
    await this.prisma.companyReadModel.upsert({
      where: { id: company.id },
      create: {
        id: company.id,
        ownerId: company.ownerId,
        name: company.name,
        type: company.type,
        status: company.status,
        description: company.description,
        logo: company.logo,
        phone: company.phone,
        email: company.email,
        address: company.address,
        country: company.country,
        city: company.city,
        taxId: company.taxId,
        website: company.website,
        isActive: company.isActive,
        version: company.version,
      },
      update: {
        name: company.name,
        type: company.type,
        status: company.status,
        description: company.description,
        logo: company.logo,
        phone: company.phone,
        email: company.email,
        address: company.address,
        country: company.country,
        city: company.city,
        taxId: company.taxId,
        website: company.website,
        isActive: company.isActive,
        version: company.version,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.companyReadModel.delete({
      where: { id },
    });
  }

  async addMember(companyId: string, member: CompanyMemberReadDto): Promise<void> {
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

  async updateMember(companyId: string, memberId: string, role: CompanyMemberRole): Promise<void> {
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

  private mapToDto(company: any): CompanyReadDto {
    return {
      id: company.id,
      ownerId: company.ownerId,
      name: company.name,
      type: company.type,
      status: company.status,
      description: company.description,
      logo: company.logo,
      phone: company.phone,
      email: company.email,
      address: company.address,
      country: company.country,
      city: company.city,
      taxId: company.taxId,
      website: company.website,
      members: (company.members || [])
        .filter((m: any) => m.isActive)
        .map((m: any) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          isActive: m.isActive,
          joinedAt: m.joinedAt,
        })),
      isActive: company.isActive,
      version: company.version ?? 1,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }
}
