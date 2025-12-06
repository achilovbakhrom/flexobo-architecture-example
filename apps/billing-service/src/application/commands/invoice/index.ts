import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure, IAggregateStore } from '@flexobo/core';
import { InvoiceAggregate, LineItem, BillingInfo } from '../../../domain/aggregates/invoice.aggregate';
import { INVOICE_AGGREGATE_STORE } from '../../../ports/invoice.repository';

export class CreateInvoiceCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly subscriptionId: string,
    public readonly companyId: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly lineItems: LineItem[],
    public readonly billingInfo: BillingInfo,
    public readonly currency: string = 'USD',
    public readonly tax: number = 0,
  ) {}
}

export class FinalizeInvoiceCommand implements ICommand {
  constructor(public readonly invoiceId: string) {}
}

export class MarkInvoicePaidCommand implements ICommand {
  constructor(
    public readonly invoiceId: string,
    public readonly paymentId: string,
  ) {}
}

export class VoidInvoiceCommand implements ICommand {
  constructor(
    public readonly invoiceId: string,
    public readonly reason?: string,
  ) {}
}

export class SetInvoicePdfUrlCommand implements ICommand {
  constructor(
    public readonly invoiceId: string,
    public readonly pdfUrl: string,
  ) {}
}

@Injectable()
@CommandHandler(CreateInvoiceCommand)
export class CreateInvoiceHandler implements ICommandHandler<CreateInvoiceCommand, InvoiceAggregate> {
  constructor(
    @Inject(INVOICE_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<InvoiceAggregate>,
  ) {}

  async execute(command: CreateInvoiceCommand): Promise<Result<InvoiceAggregate, Error>> {
    try {
      // Generate invoice number (YYYY-NNNNNN format)
      const year = new Date().getFullYear();
      const sequence = Math.floor(Math.random() * 999999)
        .toString()
        .padStart(6, '0');
      const invoiceNumber = `${year}-${sequence}`;

      // Calculate due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Calculate subtotal from line items
      const subtotal = command.lineItems.reduce((sum, item) => sum + item.amount, 0);

      const invoice = InvoiceAggregate.create({
        id: command.id,
        invoiceNumber,
        subscriptionId: command.subscriptionId,
        companyId: command.companyId,
        periodStart: command.periodStart,
        periodEnd: command.periodEnd,
        dueDate,
        lineItems: command.lineItems,
        billingInfo: command.billingInfo,
        currency: command.currency,
        subtotal,
        tax: command.tax,
      });

      await this.aggregateStore.save(invoice);
      return new Success(invoice);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(FinalizeInvoiceCommand)
export class FinalizeInvoiceHandler implements ICommandHandler<FinalizeInvoiceCommand, InvoiceAggregate> {
  constructor(
    @Inject(INVOICE_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<InvoiceAggregate>,
  ) {}

  async execute(command: FinalizeInvoiceCommand): Promise<Result<InvoiceAggregate, Error>> {
    try {
      const invoice = await this.aggregateStore.load(command.invoiceId);
      if (!invoice) {
        return new Failure(new NotFoundException(`Invoice ${command.invoiceId} not found`));
      }

      invoice.finalize();
      await this.aggregateStore.save(invoice);
      return new Success(invoice);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(MarkInvoicePaidCommand)
export class MarkInvoicePaidHandler implements ICommandHandler<MarkInvoicePaidCommand, InvoiceAggregate> {
  constructor(
    @Inject(INVOICE_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<InvoiceAggregate>,
  ) {}

  async execute(command: MarkInvoicePaidCommand): Promise<Result<InvoiceAggregate, Error>> {
    try {
      const invoice = await this.aggregateStore.load(command.invoiceId);
      if (!invoice) {
        return new Failure(new NotFoundException(`Invoice ${command.invoiceId} not found`));
      }

      invoice.markPaid(command.paymentId);
      await this.aggregateStore.save(invoice);
      return new Success(invoice);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(VoidInvoiceCommand)
export class VoidInvoiceHandler implements ICommandHandler<VoidInvoiceCommand, InvoiceAggregate> {
  constructor(
    @Inject(INVOICE_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<InvoiceAggregate>,
  ) {}

  async execute(command: VoidInvoiceCommand): Promise<Result<InvoiceAggregate, Error>> {
    try {
      const invoice = await this.aggregateStore.load(command.invoiceId);
      if (!invoice) {
        return new Failure(new NotFoundException(`Invoice ${command.invoiceId} not found`));
      }

      invoice.void(command.reason);
      await this.aggregateStore.save(invoice);
      return new Success(invoice);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

@Injectable()
@CommandHandler(SetInvoicePdfUrlCommand)
export class SetInvoicePdfUrlHandler implements ICommandHandler<SetInvoicePdfUrlCommand, InvoiceAggregate> {
  constructor(
    @Inject(INVOICE_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<InvoiceAggregate>,
  ) {}

  async execute(command: SetInvoicePdfUrlCommand): Promise<Result<InvoiceAggregate, Error>> {
    try {
      const invoice = await this.aggregateStore.load(command.invoiceId);
      if (!invoice) {
        return new Failure(new NotFoundException(`Invoice ${command.invoiceId} not found`));
      }

      invoice.setPdfUrl(command.pdfUrl);
      await this.aggregateStore.save(invoice);
      return new Success(invoice);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

export const InvoiceCommandHandlers = [
  CreateInvoiceHandler,
  FinalizeInvoiceHandler,
  MarkInvoicePaidHandler,
  VoidInvoiceHandler,
  SetInvoicePdfUrlHandler,
];
