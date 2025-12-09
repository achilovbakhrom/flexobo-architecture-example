import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma.module';
import {
  InvoiceCreatedEventData,
  InvoiceFinalizedEventData,
  InvoicePaidEventData,
  InvoiceVoidedEventData,
  InvoicePdfGeneratedEventData,
  LineItem,
} from '../../../domain/events/invoice.events';
import { InvoiceStatus } from '../../../domain/constants/enums';

interface ProjectedEvent<T> {
  aggregateId: string;
  data: T;
  version: number;
  timestamp: Date;
}

@Injectable()
export class InvoiceProjection implements OnModuleInit {
  private readonly logger = new Logger(InvoiceProjection.name);

  constructor(@Inject('PrismaService') private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('InvoiceProjection initialized');
  }

  @OnEvent('invoice.created')
  async handleInvoiceCreated(
    event: ProjectedEvent<InvoiceCreatedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting InvoiceCreatedEvent for ${event.aggregateId}`,
    );

    const data = event.data;

    // Calculate totals
    const subtotal = data.lineItems.reduce(
      (sum: number, item: LineItem) => sum + item.amount,
      0,
    );
    const total = subtotal + data.tax;

    await this.prisma.invoiceReadModel.create({
      data: {
        id: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        subscriptionId: data.subscriptionId,
        companyId: data.companyId,
        subtotal,
        tax: data.tax,
        total,
        currency: data.currency,
        status: InvoiceStatus.DRAFT,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        dueDate: new Date(data.dueDate),
        lineItems: JSON.parse(JSON.stringify(data.lineItems)),
        billingInfo: JSON.parse(JSON.stringify(data.billingInfo)),
        version: event.version,
      },
    });
  }

  @OnEvent('invoice.finalized')
  async handleInvoiceFinalized(
    event: ProjectedEvent<InvoiceFinalizedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting InvoiceFinalizedEvent for ${event.aggregateId}`,
    );

    await this.prisma.invoiceReadModel.update({
      where: { id: event.data.invoiceId },
      data: {
        status: InvoiceStatus.OPEN,
        version: event.version,
      },
    });
  }

  @OnEvent('invoice.paid')
  async handleInvoicePaid(
    event: ProjectedEvent<InvoicePaidEventData>,
  ): Promise<void> {
    this.logger.debug(`Projecting InvoicePaidEvent for ${event.aggregateId}`);

    const data = event.data;

    await this.prisma.invoiceReadModel.update({
      where: { id: data.invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        paymentId: data.paymentId,
        paidAt: new Date(data.paidAt),
        version: event.version,
      },
    });
  }

  @OnEvent('invoice.voided')
  async handleInvoiceVoided(
    event: ProjectedEvent<InvoiceVoidedEventData>,
  ): Promise<void> {
    this.logger.debug(`Projecting InvoiceVoidedEvent for ${event.aggregateId}`);

    await this.prisma.invoiceReadModel.update({
      where: { id: event.data.invoiceId },
      data: {
        status: InvoiceStatus.VOID,
        version: event.version,
      },
    });
  }

  @OnEvent('invoice.pdf_generated')
  async handleInvoicePdfGenerated(
    event: ProjectedEvent<InvoicePdfGeneratedEventData>,
  ): Promise<void> {
    this.logger.debug(
      `Projecting InvoicePdfGeneratedEvent for ${event.aggregateId}`,
    );

    await this.prisma.invoiceReadModel.update({
      where: { id: event.data.invoiceId },
      data: {
        pdfUrl: event.data.pdfUrl,
        version: event.version,
      },
    });
  }
}
