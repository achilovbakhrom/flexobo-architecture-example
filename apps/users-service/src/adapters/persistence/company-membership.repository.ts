import { Injectable, Inject } from '@nestjs/common';
import {
  ICompanyMembershipRepository,
  CompanyMembershipReadDto,
  MemberRole,
} from '../../ports/company-membership.repository';

interface CompanyMembershipPrismaClient {
  userCompanyMembership: {
    findUnique: (args: { where: { id?: string; userId_companyId?: { userId: string; companyId: string } } }) => Promise<MembershipRecord | null>;
    findFirst: (args: { where: { userId: string; isDefault?: boolean; isActive?: boolean } }) => Promise<MembershipRecord | null>;
    findMany: (args: { where: { userId?: string; companyId?: string; isActive?: boolean } }) => Promise<MembershipRecord[]>;
    create: (args: { data: CreateMembershipData }) => Promise<MembershipRecord>;
    update: (args: { where: { id: string }; data: UpdateMembershipData }) => Promise<MembershipRecord>;
    updateMany: (args: { where: { userId: string; isDefault?: boolean }; data: { isDefault: boolean } }) => Promise<{ count: number }>;
    delete: (args: { where: { id: string } }) => Promise<MembershipRecord>;
  };
  $transaction: <T>(operations: Promise<T>[]) => Promise<T[]>;
}

interface MembershipRecord {
  id: string;
  userId: string;
  companyId: string;
  memberRole: string;
  isActive: boolean;
  isDefault: boolean;
  joinedAt: Date;
  leftAt: Date | null;
}

interface CreateMembershipData {
  id: string;
  userId: string;
  companyId: string;
  memberRole: string;
  isDefault?: boolean;
}

interface UpdateMembershipData {
  memberRole?: string;
  isActive?: boolean;
  isDefault?: boolean;
  leftAt?: Date;
}

@Injectable()
export class PrismaCompanyMembershipRepository implements ICompanyMembershipRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: CompanyMembershipPrismaClient
  ) {}

  private mapToDto(record: MembershipRecord): CompanyMembershipReadDto {
    return {
      id: record.id,
      userId: record.userId,
      companyId: record.companyId,
      memberRole: record.memberRole as MemberRole,
      isActive: record.isActive,
      isDefault: record.isDefault,
      joinedAt: record.joinedAt,
      leftAt: record.leftAt,
    };
  }

  async findById(id: string): Promise<CompanyMembershipReadDto | null> {
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: { id },
    });
    return membership ? this.mapToDto(membership) : null;
  }

  async findByUserAndCompany(
    userId: string,
    companyId: string
  ): Promise<CompanyMembershipReadDto | null> {
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });
    return membership ? this.mapToDto(membership) : null;
  }

  async findByUser(userId: string, activeOnly = true): Promise<CompanyMembershipReadDto[]> {
    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: {
        userId,
        ...(activeOnly && { isActive: true }),
      },
    });
    return memberships.map((m) => this.mapToDto(m));
  }

  async findByCompany(companyId: string, activeOnly = true): Promise<CompanyMembershipReadDto[]> {
    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: {
        companyId,
        ...(activeOnly && { isActive: true }),
      },
    });
    return memberships.map((m) => this.mapToDto(m));
  }

  async findDefaultForUser(userId: string): Promise<CompanyMembershipReadDto | null> {
    const membership = await this.prisma.userCompanyMembership.findFirst({
      where: {
        userId,
        isDefault: true,
        isActive: true,
      },
    });
    return membership ? this.mapToDto(membership) : null;
  }

  async create(data: {
    id: string;
    userId: string;
    companyId: string;
    memberRole: MemberRole;
    isDefault?: boolean;
  }): Promise<void> {
    await this.prisma.userCompanyMembership.create({
      data: {
        id: data.id,
        userId: data.userId,
        companyId: data.companyId,
        memberRole: data.memberRole,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async update(
    id: string,
    data: {
      memberRole?: MemberRole;
      isActive?: boolean;
      isDefault?: boolean;
      leftAt?: Date;
    }
  ): Promise<void> {
    await this.prisma.userCompanyMembership.update({
      where: { id },
      data: {
        memberRole: data.memberRole,
        isActive: data.isActive,
        isDefault: data.isDefault,
        leftAt: data.leftAt,
      },
    });
  }

  async setDefault(userId: string, companyId: string): Promise<void> {
    // First, unset all defaults for this user
    await this.prisma.userCompanyMembership.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Then set the new default
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (membership) {
      await this.prisma.userCompanyMembership.update({
        where: { id: membership.id },
        data: { isDefault: true },
      });
    }
  }

  async leave(userId: string, companyId: string): Promise<void> {
    const membership = await this.prisma.userCompanyMembership.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (membership) {
      await this.prisma.userCompanyMembership.update({
        where: { id: membership.id },
        data: {
          isActive: false,
          isDefault: false,
          leftAt: new Date(),
        },
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userCompanyMembership.delete({ where: { id } });
  }
}
