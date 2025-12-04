import { InvoiceStatus } from '../domain/constants/enums';
import { BillingInfo, LineItem } from '../domain/events/invoice.events';

export const INVOICE_AGGREGATE_STORE = Symbol('INVOICE_AGGREGATE_STORE');
export const INVOICE_READ_REPOSITORY = Symbol('INVOICE_READ_REPOSITORY');

export interface InvoiceReadData {
  id: string;
  subscriptionId: string;
  companyId: string;
  paymentId?: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  paidAt?: Date;
  lineItems: LineItem[];
  billingInfo: BillingInfo;
  pdfUrl?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoiceReadRepository {
  findById(id: string): Promise<InvoiceReadData | null>;
  findByInvoiceNumber(invoiceNumber: string): Promise<InvoiceReadData | null>;
  findBySubscriptionId(subscriptionId: string): Promise<InvoiceReadData[]>;
  findByCompanyId(companyId: string, limit?: number): Promise<InvoiceReadData[]>;
  findOverdue(): Promise<InvoiceReadData[]>;
  findByStatus(status: InvoiceStatus): Promise<InvoiceReadData[]>;
  save(invoice: InvoiceReadData): Promise<void>;
  update(id: string, data: Partial<InvoiceReadData>): Promise<void>;
  getNextInvoiceNumber(): Promise<string>;
}
