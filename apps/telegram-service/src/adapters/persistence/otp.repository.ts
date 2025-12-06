import { Injectable, Inject } from '@nestjs/common';
import { IOtpRepository, OtpReadDto } from '../../ports/otp.repository';

interface OtpPrismaClient {
  otpRequestReadModel: {
    findUnique: (args: unknown) => Promise<OtpReadDto | null>;
    findFirst: (args: unknown) => Promise<OtpReadDto | null>;
    create: (args: unknown) => Promise<OtpReadDto>;
    update: (args: unknown) => Promise<OtpReadDto>;
    delete: (args: unknown) => Promise<OtpReadDto>;
  };
}

@Injectable()
export class PrismaOtpRepository implements IOtpRepository {
  constructor(@Inject('PrismaClient') private readonly prisma: OtpPrismaClient) {}

  async findById(id: string): Promise<OtpReadDto | null> {
    return this.prisma.otpRequestReadModel.findUnique({
      where: { id },
    });
  }

  async findByPhone(phone: string, type?: string): Promise<OtpReadDto | null> {
    return this.prisma.otpRequestReadModel.findFirst({
      where: {
        phone,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTelegramId(telegramId: string, type?: string): Promise<OtpReadDto | null> {
    return this.prisma.otpRequestReadModel.findFirst({
      where: {
        telegramId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    id: string;
    phone: string;
    telegramId?: string;
    code: string;
    type: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.otpRequestReadModel.create({
      data: {
        id: data.id,
        phone: data.phone,
        telegramId: data.telegramId,
        code: data.code,
        type: data.type,
        status: 'PENDING',
        attempts: 0,
        expiresAt: data.expiresAt,
      },
    });
  }

  async updateStatus(id: string, status: string, verifiedAt?: Date): Promise<void> {
    await this.prisma.otpRequestReadModel.update({
      where: { id },
      data: {
        status,
        ...(verifiedAt && { verifiedAt }),
      },
    });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.otpRequestReadModel.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.otpRequestReadModel.delete({
      where: { id },
    });
  }
}
