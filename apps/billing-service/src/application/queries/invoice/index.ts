import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { INVOICE_READ_REPOSITORY } from '../../../ports/invoice.repository';

export interface LineItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface BillingInfoDto {
  companyName: string;
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  taxId?: string;
  email: string;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  companyId: string;
  paymentId?: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  paidAt?: Date;
  lineItems: LineItemDto[];
  billingInfo: BillingInfoDto;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceListResult {
  items: InvoiceDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IInvoiceReadRepository {
  findById(id: string): Promise<InvoiceDto | null>;
  findByInvoiceNumber(invoiceNumber: string): Promise<InvoiceDto | null>;
  findBySubscriptionId(
    subscriptionId: string,
    page?: number,
    pageSize?: number,
  ): Promise<InvoiceListResult>;
  findByCompanyId(
    companyId: string,
    page?: number,
    pageSize?: number,
  ): Promise<InvoiceListResult>;
  findUnpaidOverdue(): Promise<InvoiceDto[]>;
}

export class GetInvoiceQuery implements IQuery {
  constructor(public readonly invoiceId: string) {}
}

export class GetInvoiceByNumberQuery implements IQuery {
  constructor(public readonly invoiceNumber: string) {}
}

export class ListInvoicesBySubscriptionQuery implements IQuery {
  constructor(
    public readonly subscriptionId: string,
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {}
}

export class ListInvoicesByCompanyQuery implements IQuery {
  constructor(
    public readonly companyId: string,
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {}
}

export class GetUnpaidOverdueInvoicesQuery implements IQuery {
  constructor() {}
}

@Injectable()
@QueryHandler(GetInvoiceQuery)
export class GetInvoiceHandler implements IQueryHandler<GetInvoiceQuery> {
  constructor(@Inject(INVOICE_READ_REPOSITORY) private readonly invoiceReadRepository: IInvoiceReadRepository) {}

  async execute(query: GetInvoiceQuery): Promise<InvoiceDto | null> {
    return this.invoiceReadRepository.findById(query.invoiceId);
  }
}

@Injectable()
@QueryHandler(GetInvoiceByNumberQuery)
export class GetInvoiceByNumberHandler
  implements IQueryHandler<GetInvoiceByNumberQuery>
{
  constructor(@Inject(INVOICE_READ_REPOSITORY) private readonly invoiceReadRepository: IInvoiceReadRepository) {}

  async execute(query: GetInvoiceByNumberQuery): Promise<InvoiceDto | null> {
    return this.invoiceReadRepository.findByInvoiceNumber(query.invoiceNumber);
  }
}

@Injectable()
@QueryHandler(ListInvoicesBySubscriptionQuery)
export class ListInvoicesBySubscriptionHandler
  implements IQueryHandler<ListInvoicesBySubscriptionQuery>
{
  constructor(@Inject(INVOICE_READ_REPOSITORY) private readonly invoiceReadRepository: IInvoiceReadRepository) {}

  async execute(query: ListInvoicesBySubscriptionQuery): Promise<InvoiceListResult> {
    return this.invoiceReadRepository.findBySubscriptionId(
      query.subscriptionId,
      query.page,
      query.pageSize,
    );
  }
}

@Injectable()
@QueryHandler(ListInvoicesByCompanyQuery)
export class ListInvoicesByCompanyHandler
  implements IQueryHandler<ListInvoicesByCompanyQuery>
{
  constructor(@Inject(INVOICE_READ_REPOSITORY) private readonly invoiceReadRepository: IInvoiceReadRepository) {}

  async execute(query: ListInvoicesByCompanyQuery): Promise<InvoiceListResult> {
    return this.invoiceReadRepository.findByCompanyId(
      query.companyId,
      query.page,
      query.pageSize,
    );
  }
}

@Injectable()
@QueryHandler(GetUnpaidOverdueInvoicesQuery)
export class GetUnpaidOverdueInvoicesHandler
  implements IQueryHandler<GetUnpaidOverdueInvoicesQuery>
{
  constructor(@Inject(INVOICE_READ_REPOSITORY) private readonly invoiceReadRepository: IInvoiceReadRepository) {}

  async execute(_query: GetUnpaidOverdueInvoicesQuery): Promise<InvoiceDto[]> {
    return this.invoiceReadRepository.findUnpaidOverdue();
  }
}

export const InvoiceQueryHandlers = [
  GetInvoiceHandler,
  GetInvoiceByNumberHandler,
  ListInvoicesBySubscriptionHandler,
  ListInvoicesByCompanyHandler,
  GetUnpaidOverdueInvoicesHandler,
];
