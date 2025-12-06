import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma.module';
import { PaymentProvider } from '../../../domain/constants/enums';
import {
  IPaymentReadRepository,
  PaymentReadData,
} from '../../../ports/payment.repository';

@Injectable()
export class PaymentReadRepository implements IPaymentReadRepository {
  constructor(@Inject('PrismaService') private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PaymentReadData | null> {
    const payment = await this.prisma.paymentReadModel.findUnique({
      where: { id },
    });

    if (!payment) {
      return null;
    }

    return this.toDto(payment);
  }

  async findByExternalId(
    provider: PaymentProvider,
    externalId: string,
  ): Promise<PaymentReadData | null> {
    const payment = await this.prisma.paymentReadModel.findFirst({
      where: {
        provider,
        externalId,
      },
    });

    if (!payment) {
      return null;
    }

    return this.toDto(payment);
  }

  async findBySubscriptionId(subscriptionId: string): Promise<PaymentReadData[]> {
    const payments = await this.prisma.paymentReadModel.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => this.toDto(p));
  }

  async findByCompanyId(companyId: string, limit?: number): Promise<PaymentReadData[]> {
    const payments = await this.prisma.paymentReadModel.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return payments.map((p) => this.toDto(p));
  }

  async findPending(): Promise<PaymentReadData[]> {
    const payments = await this.prisma.paymentReadModel.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    return payments.map((p) => this.toDto(p));
  }

  async save(payment: PaymentReadData): Promise<void> {
    await this.prisma.paymentReadModel.upsert({
      where: { id: payment.id },
      create: {
        id: payment.id,
        subscriptionId: payment.subscriptionId,
        companyId: payment.companyId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        externalId: payment.externalId,
        paymentType: payment.paymentType,
        paymentMethod: payment.paymentMethod as object,
        failureReason: payment.failureReason,
        retryCount: payment.retryCount,
        version: payment.version,
      },
      update: {
        subscriptionId: payment.subscriptionId,
        companyId: payment.companyId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        externalId: payment.externalId,
        paymentType: payment.paymentType,
        paymentMethod: payment.paymentMethod as object,
        failureReason: payment.failureReason,
        retryCount: payment.retryCount,
        version: payment.version,
      },
    });
  }

  async update(id: string, data: Partial<PaymentReadData>): Promise<void> {
    await this.prisma.paymentReadModel.update({
      where: { id },
      data: {
        ...data,
        paymentMethod: data.paymentMethod ? (data.paymentMethod as object) : undefined,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDto(payment: any): PaymentReadData {
    return {
      id: payment.id,
      subscriptionId: payment.subscriptionId,
      companyId: payment.companyId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      paymentType: payment.paymentType,
      externalId: payment.externalId,
      paymentMethod: payment.paymentMethod as PaymentReadData['paymentMethod'],
      failureReason: payment.failureReason,
      retryCount: payment.retryCount,
      version: payment.version,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
