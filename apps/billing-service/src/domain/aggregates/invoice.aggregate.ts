import { v4 as uuid } from 'uuid';
import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { InvoiceStatus } from '../constants/enums';
import {
  InvoiceEventType,
  InvoiceCreatedEventData,
  InvoiceFinalizedEventData,
  InvoicePaidEventData,
  InvoiceVoidedEventData,
  InvoicePdfGeneratedEventData,
  LineItem,
  BillingInfo,
} from '../events/invoice.events';
import { Money } from '../value-objects/money.vo';

// Re-export LineItem and BillingInfo for external use
export { LineItem, BillingInfo } from '../events/invoice.events';

export interface InvoiceState {
  id: string;
  subscriptionId: string;
  companyId: string;
  paymentId?: string;
  invoiceNumber: string;
  subtotal: Money;
  tax: Money;
  total: Money;
  status: InvoiceStatus;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  paidAt?: Date;
  lineItems: LineItem[];
  billingInfo: BillingInfo;
  pdfUrl?: string;
}

export interface CreateInvoiceData {
  id?: string;
  subscriptionId: string;
  companyId: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  lineItems: LineItem[];
  billingInfo: BillingInfo;
}

export class InvoiceAggregate extends AggregateRoot {
  private state!: InvoiceState;

  get invoiceId(): string {
    return this.state.id;
  }

  get subscriptionId(): string {
    return this.state.subscriptionId;
  }

  get companyId(): string {
    return this.state.companyId;
  }

  get paymentId(): string | undefined {
    return this.state.paymentId;
  }

  get invoiceNumber(): string {
    return this.state.invoiceNumber;
  }

  get subtotal(): Money {
    return this.state.subtotal;
  }

  get tax(): Money {
    return this.state.tax;
  }

  get total(): Money {
    return this.state.total;
  }

  get status(): InvoiceStatus {
    return this.state.status;
  }

  get periodStart(): Date {
    return this.state.periodStart;
  }

  get periodEnd(): Date {
    return this.state.periodEnd;
  }

  get dueDate(): Date {
    return this.state.dueDate;
  }

  get paidAt(): Date | undefined {
    return this.state.paidAt;
  }

  get lineItems(): LineItem[] {
    return [...this.state.lineItems];
  }

  get billingInfo(): BillingInfo {
    return { ...this.state.billingInfo };
  }

  get pdfUrl(): string | undefined {
    return this.state.pdfUrl;
  }

  static create(data: CreateInvoiceData): InvoiceAggregate {
    const id = data.id ?? uuid();
    const aggregate = new InvoiceAggregate(id);
    const total = data.subtotal + data.tax;

    const eventData: InvoiceCreatedEventData = {
      invoiceId: id,
      subscriptionId: data.subscriptionId,
      companyId: data.companyId,
      invoiceNumber: data.invoiceNumber,
      subtotal: data.subtotal,
      tax: data.tax,
      total,
      currency: data.currency,
      periodStart: data.periodStart.toISOString(),
      periodEnd: data.periodEnd.toISOString(),
      dueDate: data.dueDate.toISOString(),
      lineItems: data.lineItems,
      billingInfo: data.billingInfo,
    };

    const event = aggregate.createEvent(InvoiceEventType.Created, eventData);
    aggregate.addEvent(event);
    aggregate.apply(event);

    return aggregate;
  }

  static fromEvents(events: DomainEvent[]): InvoiceAggregate {
    if (events.length === 0) {
      throw new Error('Cannot create InvoiceAggregate from empty events');
    }
    const aggregate = new InvoiceAggregate(events[0].aggregateId);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  finalize(): void {
    if (this.state.status !== InvoiceStatus.DRAFT) {
      throw new Error(`Cannot finalize invoice in ${this.state.status} status`);
    }

    const eventData: InvoiceFinalizedEventData = {
      invoiceId: this.id,
    };

    const event = this.createEvent(InvoiceEventType.Finalized, eventData);
    this.addEvent(event);
    this.apply(event);
  }

  markPaid(paymentId: string): void {
    if (this.state.status !== InvoiceStatus.OPEN) {
      throw new Error(
        `Cannot mark invoice as paid in ${this.state.status} status`,
      );
    }

    const eventData: InvoicePaidEventData = {
      invoiceId: this.id,
      paymentId,
      paidAt: new Date().toISOString(),
    };

    const event = this.createEvent(InvoiceEventType.Paid, eventData);
    this.addEvent(event);
    this.apply(event);
  }

  void(reason?: string): void {
    if (
      this.state.status !== InvoiceStatus.DRAFT &&
      this.state.status !== InvoiceStatus.OPEN
    ) {
      throw new Error(`Cannot void invoice in ${this.state.status} status`);
    }

    const eventData: InvoiceVoidedEventData = {
      invoiceId: this.id,
      reason,
      voidedAt: new Date().toISOString(),
    };

    const event = this.createEvent(InvoiceEventType.Voided, eventData);
    this.addEvent(event);
    this.apply(event);
  }

  setPdfUrl(pdfUrl: string): void {
    const eventData: InvoicePdfGeneratedEventData = {
      invoiceId: this.id,
      pdfUrl,
    };

    const event = this.createEvent(InvoiceEventType.PdfGenerated, eventData);
    this.addEvent(event);
    this.apply(event);
  }

  isOverdue(): boolean {
    return (
      this.state.status === InvoiceStatus.OPEN && new Date() > this.state.dueDate
    );
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case InvoiceEventType.Created:
        this.applyInvoiceCreated(event.data as InvoiceCreatedEventData);
        break;
      case InvoiceEventType.Finalized:
        this.applyInvoiceFinalized();
        break;
      case InvoiceEventType.Paid:
        this.applyInvoicePaid(event.data as InvoicePaidEventData);
        break;
      case InvoiceEventType.Voided:
        this.applyInvoiceVoided();
        break;
      case InvoiceEventType.PdfGenerated:
        this.applyInvoicePdfGenerated(event.data as InvoicePdfGeneratedEventData);
        break;
    }
  }

  private applyInvoiceCreated(data: InvoiceCreatedEventData): void {
    this.state = {
      id: data.invoiceId,
      subscriptionId: data.subscriptionId,
      companyId: data.companyId,
      invoiceNumber: data.invoiceNumber,
      subtotal: Money.create(data.subtotal, data.currency),
      tax: Money.create(data.tax, data.currency),
      total: Money.create(data.total, data.currency),
      status: InvoiceStatus.DRAFT,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      dueDate: new Date(data.dueDate),
      lineItems: data.lineItems,
      billingInfo: data.billingInfo,
    };
  }

  private applyInvoiceFinalized(): void {
    this.state.status = InvoiceStatus.OPEN;
  }

  private applyInvoicePaid(data: InvoicePaidEventData): void {
    this.state.status = InvoiceStatus.PAID;
    this.state.paymentId = data.paymentId;
    this.state.paidAt = new Date(data.paidAt);
  }

  private applyInvoiceVoided(): void {
    this.state.status = InvoiceStatus.VOID;
  }

  private applyInvoicePdfGenerated(data: InvoicePdfGeneratedEventData): void {
    this.state.pdfUrl = data.pdfUrl;
  }

  toJSON(): InvoiceState & { version: number } {
    return {
      ...this.state,
      version: this.version,
    };
  }
}
