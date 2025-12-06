import { Injectable, Inject } from '@nestjs/common';
import {
  IInvitationRepository,
  InvitationReadDto,
  InvitationStatus,
} from '../../ports/invitation.repository';

interface InvitationPrismaClient {
  userInvitation: {
    findUnique: (args: { where: { id?: string; token?: string } }) => Promise<InvitationRecord | null>;
    findFirst: (args: { where: { email: string; companyId: string; status: InvitationStatus } }) => Promise<InvitationRecord | null>;
    findMany: (args: { where: { email?: string; companyId?: string; status?: InvitationStatus } }) => Promise<InvitationRecord[]>;
    create: (args: { data: CreateInvitationData }) => Promise<InvitationRecord>;
    update: (args: { where: { id: string }; data: UpdateInvitationData }) => Promise<InvitationRecord>;
    delete: (args: { where: { id: string } }) => Promise<InvitationRecord>;
    deleteMany: (args: { where: { expiresAt: { lt: Date }; status: InvitationStatus } }) => Promise<{ count: number }>;
  };
}

interface InvitationRecord {
  id: string;
  email: string;
  phone: string | null;
  invitedBy: string;
  companyId: string;
  roleId: string | null;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedBy: string | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateInvitationData {
  id: string;
  email: string;
  phone?: string;
  invitedBy: string;
  companyId: string;
  roleId?: string;
  token: string;
  expiresAt: Date;
}

interface UpdateInvitationData {
  status?: InvitationStatus;
  acceptedAt?: Date;
  acceptedBy?: string;
  rejectedAt?: Date;
}

@Injectable()
export class PrismaInvitationRepository implements IInvitationRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: InvitationPrismaClient
  ) {}

  private mapToDto(record: InvitationRecord): InvitationReadDto {
    return {
      id: record.id,
      email: record.email,
      phone: record.phone,
      invitedBy: record.invitedBy,
      companyId: record.companyId,
      roleId: record.roleId,
      token: record.token,
      status: record.status,
      expiresAt: record.expiresAt,
      acceptedAt: record.acceptedAt,
      acceptedBy: record.acceptedBy,
      rejectedAt: record.rejectedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async findById(id: string): Promise<InvitationReadDto | null> {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { id },
    });
    return invitation ? this.mapToDto(invitation) : null;
  }

  async findByToken(token: string): Promise<InvitationReadDto | null> {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
    });
    return invitation ? this.mapToDto(invitation) : null;
  }

  async findByEmail(email: string, status?: InvitationStatus): Promise<InvitationReadDto[]> {
    const invitations = await this.prisma.userInvitation.findMany({
      where: {
        email,
        ...(status && { status }),
      },
    });
    return invitations.map((i) => this.mapToDto(i));
  }

  async findByCompany(companyId: string, status?: InvitationStatus): Promise<InvitationReadDto[]> {
    const invitations = await this.prisma.userInvitation.findMany({
      where: {
        companyId,
        ...(status && { status }),
      },
    });
    return invitations.map((i) => this.mapToDto(i));
  }

  async findPendingByEmailAndCompany(
    email: string,
    companyId: string
  ): Promise<InvitationReadDto | null> {
    const invitation = await this.prisma.userInvitation.findFirst({
      where: {
        email,
        companyId,
        status: 'PENDING',
      },
    });
    return invitation ? this.mapToDto(invitation) : null;
  }

  async create(data: {
    id: string;
    email: string;
    phone?: string;
    invitedBy: string;
    companyId: string;
    roleId?: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.userInvitation.create({
      data: {
        id: data.id,
        email: data.email,
        phone: data.phone,
        invitedBy: data.invitedBy,
        companyId: data.companyId,
        roleId: data.roleId,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
  }

  async updateStatus(
    id: string,
    status: InvitationStatus,
    data?: {
      acceptedAt?: Date;
      acceptedBy?: string;
      rejectedAt?: Date;
    }
  ): Promise<void> {
    await this.prisma.userInvitation.update({
      where: { id },
      data: {
        status,
        ...data,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userInvitation.delete({ where: { id } });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.userInvitation.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        status: 'PENDING',
      },
    });
    return result.count;
  }
}
