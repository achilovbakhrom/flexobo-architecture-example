import { Injectable, Inject } from '@nestjs/common';
import {
  IOTPRepository,
  CreateOTPData,
  FindOTPParams,
  IOTP,
} from '../../ports';

interface OTPPrismaClient {
  oTP: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    deleteMany: (args: any) => Promise<any>;
  };
}

@Injectable()
export class OTPRepository implements IOTPRepository {
  constructor(@Inject('PrismaClient') private readonly prisma: OTPPrismaClient) {}

  async create(data: CreateOTPData): Promise<IOTP> {
    const otp = await this.prisma.oTP.create({
      data: {
        code: data.code,
        codeHash: data.codeHash,
        authMethod: data.authMethod,
        phoneNumber: data.phoneNumber,
        email: data.email,
        expiresAt: data.expiresAt,
      },
    });

    return this.mapToIOTP(otp);
  }

  async findByCodeAndHash(params: FindOTPParams): Promise<IOTP | null> {
    const where: Record<string, unknown> = {
      code: params.code,
      codeHash: params.codeHash,
    };

    if (params.phoneNumber) {
      where.phoneNumber = params.phoneNumber;
      where.authMethod = 'PHONE_NUMBER';
    } else if (params.email) {
      where.email = params.email;
      where.authMethod = 'EMAIL';
    }

    const otp = await this.prisma.oTP.findFirst({ where });

    return otp ? this.mapToIOTP(otp) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.oTP.delete({ where: { id } });
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.oTP.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  private mapToIOTP(otp: {
    id: string;
    code: number;
    codeHash: string;
    authMethod: string;
    phoneNumber: string | null;
    email: string | null;
    expiresAt: Date;
    verified: boolean;
    createdAt: Date;
  }): IOTP {
    return {
      id: otp.id,
      code: otp.code,
      codeHash: otp.codeHash,
      authMethod: otp.authMethod as 'PHONE_NUMBER' | 'EMAIL',
      phoneNumber: otp.phoneNumber,
      email: otp.email,
      expiresAt: otp.expiresAt,
      verified: otp.verified,
      createdAt: otp.createdAt,
    };
  }
}
