import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.module';
import {
  IInvoiceReadRepository,
  InvoiceDto,
  InvoiceListResult,
  LineItemDto,
  BillingInfoDto,
} from '../../../application/queries/invoice';

@Injectable()
export class InvoiceReadRepository implements IInvoiceReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<InvoiceDto | null> {
    const invoice = await this.prisma.invoiceReadModel.findUnique({
      where: { id },
    });

    if (!invoice) {
      return null;
    }

    return this.toDto(invoice);
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<InvoiceDto | null> {
    const invoice = await this.prisma.invoiceReadModel.findUnique({
      where: { invoiceNumber },
    });

    if (!invoice) {
      return null;
    }

    return this.toDto(invoice);
  }

  async findBySubscriptionId(
    subscriptionId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<InvoiceListResult> {
    const skip = (page - 1) * pageSize;

    const [invoices, total] = await Promise.all([
      this.prisma.invoiceReadModel.findMany({
        where: { subscriptionId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.invoiceReadModel.count({ where: { subscriptionId } }),
    ]);

    return {
      items: invoices.map(this.toDto),
      total,
      page,
      pageSize,
    };
  }

  async findByCompanyId(
    companyId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<InvoiceListResult> {
    const skip = (page - 1) * pageSize;

    const [invoices, total] = await Promise.all([
      this.prisma.invoiceReadModel.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.invoiceReadModel.count({ where: { companyId } }),
    ]);

    return {
      items: invoices.map(this.toDto),
      total,
      page,
      pageSize,
    };
  }

  async findUnpaidOverdue(): Promise<InvoiceDto[]> {
    const now = new Date();

    const invoices = await this.prisma.invoiceReadModel.findMany({
      where: {
        status: 'OPEN',
        dueDate: {
          lt: now,
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return invoices.map(this.toDto);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDto(invoice: any): InvoiceDto {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      subscriptionId: invoice.subscriptionId,
      companyId: invoice.companyId,
      paymentId: invoice.paymentId,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      lineItems: invoice.lineItems as LineItemDto[],
      billingInfo: invoice.billingInfo as BillingInfoDto,
      pdfUrl: invoice.pdfUrl,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }
}
