// Invoice Event Types
export enum InvoiceEventType {
  Created = 'invoice.created',
  Finalized = 'invoice.finalized',
  Paid = 'invoice.paid',
  Voided = 'invoice.voided',
  PdfGenerated = 'invoice.pdf_generated',
}

// Line Item
export type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

// Billing Info
export type BillingInfo = {
  companyName: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  email?: string;
};

// Invoice Event Data Types (use type for Record<string, unknown> compatibility)
export type InvoiceCreatedEventData = {
  invoiceId: string;
  subscriptionId: string;
  companyId: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  lineItems: LineItem[];
  billingInfo: BillingInfo;
};

export type InvoiceFinalizedEventData = {
  invoiceId: string;
};

export type InvoicePaidEventData = {
  invoiceId: string;
  paymentId: string;
  paidAt: string;
};

export type InvoiceVoidedEventData = {
  invoiceId: string;
  reason?: string;
  voidedAt: string;
};

export type InvoicePdfGeneratedEventData = {
  invoiceId: string;
  pdfUrl: string;
};

// Event interfaces for type discrimination
export interface InvoiceCreatedEvent {
  type: InvoiceEventType.Created;
  data: InvoiceCreatedEventData;
}

export interface InvoiceFinalizedEvent {
  type: InvoiceEventType.Finalized;
  data: InvoiceFinalizedEventData;
}

export interface InvoicePaidEvent {
  type: InvoiceEventType.Paid;
  data: InvoicePaidEventData;
}

export interface InvoiceVoidedEvent {
  type: InvoiceEventType.Voided;
  data: InvoiceVoidedEventData;
}

export interface InvoicePdfGeneratedEvent {
  type: InvoiceEventType.PdfGenerated;
  data: InvoicePdfGeneratedEventData;
}

// Union type of all invoice events
export type InvoiceEvent =
  | InvoiceCreatedEvent
  | InvoiceFinalizedEvent
  | InvoicePaidEvent
  | InvoiceVoidedEvent
  | InvoicePdfGeneratedEvent;
