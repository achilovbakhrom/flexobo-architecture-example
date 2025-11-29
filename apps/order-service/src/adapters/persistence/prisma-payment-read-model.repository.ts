/**
 * Prisma Payment Read Model Repository (Adapter)
 *
 * Implements IPaymentReadModelRepository for queries.
 */

import { Injectable, Inject } from '@nestjs/common';
import {
  IPaymentReadModelRepository,
  PAYMENT_READ_MODEL_REPOSITORY,
} from '../../ports/payment.repository.port';
import { PaymentDto } from '../../application/dto/payment.dto';
import { noop } from 'rxjs';

interface PaymentPrismaClient {
  paymentReadModel: {
    findUnique: (args: {
      where: { id?: string; transactionId?: string };
    }) => Promise<PaymentRecord | null>;
    findMany: (args: {
      where?: { orderId?: string; status?: string };
      orderBy?: { createdAt: 'asc' | 'desc' };
      take?: number;
      skip?: number;
    }) => Promise<PaymentRecord[]>;
    upsert: (args: {
      where: { id: string };
      create: Omit<PaymentRecord, 'createdAt' | 'updatedAt'>;
      update: Partial<Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => Promise<PaymentRecord>;
    delete: (args: { where: { id: string } }) => Promise<PaymentRecord>;
  };
}

interface PaymentRecord {
  id: string;
  orderId: string;
  amount: unknown;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId: string | null;
  failureReason: string | null;
  refundedAmount: unknown;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaPaymentReadModelRepository
  implements IPaymentReadModelRepository
{
  constructor(
    @Inject('PrismaClient') private readonly prisma: PaymentPrismaClient
  ) {}

  async findById(paymentId: string): Promise<PaymentDto | null> {
    const payment = await this.prisma.paymentReadModel.findUnique({
      where: { id: paymentId },
    });
    return payment ? this.mapToDto(payment) : null;
  }

  async findByOrderId(orderId: string): Promise<PaymentDto[]> {
    const payments = await this.prisma.paymentReadModel.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((p) => this.mapToDto(p));
  }

  async findByStatus(
    status: string,
    options?: { limit?: number; offset?: number }
  ): Promise<PaymentDto[]> {
    const payments = await this.prisma.paymentReadModel.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
    return payments.map((p) => this.mapToDto(p));
  }

  async findByTransactionId(transactionId: string): Promise<PaymentDto | null> {
    const payment = await this.prisma.paymentReadModel.findUnique({
      where: { transactionId },
    });
    return payment ? this.mapToDto(payment) : null;
  }

  async upsert(payment: Omit<PaymentDto, 'createdAt'>): Promise<void> {
    await this.prisma.paymentReadModel.upsert({
      where: { id: payment.id },
      create: {
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId ?? null,
        failureReason: payment.failureReason ?? null,
        refundedAmount: payment.refundedAmount ?? null,
        processedAt: payment.processedAt ?? null,
      },
      update: {
        status: payment.status,
        transactionId: payment.transactionId ?? null,
        failureReason: payment.failureReason ?? null,
        refundedAmount: payment.refundedAmount ?? null,
        processedAt: payment.processedAt ?? null,
      },
    });
  }

  async delete(paymentId: string): Promise<void> {
    await this.prisma.paymentReadModel
      .delete({ where: { id: paymentId } })
      .catch(noop);
  }

  private mapToDto(payment: PaymentRecord): PaymentDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      failureReason: payment.failureReason,
      refundedAmount: payment.refundedAmount
        ? Number(payment.refundedAmount)
        : null,
      processedAt: payment.processedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}

export { PAYMENT_READ_MODEL_REPOSITORY };
