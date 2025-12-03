import { v4 as uuid } from 'uuid';
import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  BillingCycle,
  PaymentProvider,
  SubscriptionStatus,
  UsageType,
} from '../constants/enums';
import {
  SubscriptionEventType,
  SubscriptionCreatedEventData,
  SubscriptionActivatedEventData,
  SubscriptionPlanChangedEventData,
  UsageRecordedEventData,
  SubscriptionCancellationScheduledEventData,
  SubscriptionCancelledEventData,
  SubscriptionRenewedEventData,
  SubscriptionPastDueEventData,
  SubscriptionExpiredEventData,
  UsageLimitReachedEventData,
} from '../events/subscription.events';
import { BillingPeriod } from '../value-objects/billing-period.vo';
import { PlanLimits } from '../value-objects/plan-limits.vo';

export interface UsageData {
  [key: string]: number;
}

export interface SubscriptionState {
  id: string;
  companyId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  paymentProvider?: PaymentProvider;
  externalId?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  cancellationReason?: string;
  usageData: UsageData;
}

export interface CreateSubscriptionData {
  id?: string;
  companyId: string;
  planId: string;
  billingCycle: BillingCycle;
  trialDays?: number;
}

export class SubscriptionAggregate extends AggregateRoot {
  private state!: SubscriptionState;
  private planLimits?: PlanLimits;

  get subscriptionId(): string {
    return this.state.id;
  }

  get companyId(): string {
    return this.state.companyId;
  }

  get planId(): string {
    return this.state.planId;
  }

  get status(): SubscriptionStatus {
    return this.state.status;
  }

  get billingCycle(): BillingCycle {
    return this.state.billingCycle;
  }

  get currentPeriodStart(): Date {
    return this.state.currentPeriodStart;
  }

  get currentPeriodEnd(): Date {
    return this.state.currentPeriodEnd;
  }

  get trialEnd(): Date | undefined {
    return this.state.trialEnd;
  }

  get paymentProvider(): PaymentProvider | undefined {
    return this.state.paymentProvider;
  }

  get externalId(): string | undefined {
    return this.state.externalId;
  }

  get cancelAtPeriodEnd(): boolean {
    return this.state.cancelAtPeriodEnd;
  }

  get usageData(): UsageData {
    return { ...this.state.usageData };
  }

  setPlanLimits(limits: PlanLimits): void {
    this.planLimits = limits;
  }

  static create(data: CreateSubscriptionData): SubscriptionAggregate {
    const id = data.id ?? uuid();
    const aggregate = new SubscriptionAggregate(id);
    const now = new Date();

    const period = BillingPeriod.create(now, data.billingCycle);
    const trialDays = data.trialDays ?? 0;
    const isTrialing = trialDays > 0;

    let trialEnd: Date | undefined;
    if (isTrialing) {
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + trialDays);
    }

    const eventData: SubscriptionCreatedEventData = {
      subscriptionId: id,
      companyId: data.companyId,
      planId: data.planId,
      billingCycle: data.billingCycle,
      currentPeriodStart: period.start.toISOString(),
      currentPeriodEnd: period.end.toISOString(),
      trialEnd: trialEnd?.toISOString(),
      status: isTrialing
        ? SubscriptionStatus.TRIALING
        : SubscriptionStatus.ACTIVE,
    };

    const event = aggregate.createEvent(
      SubscriptionEventType.Created,
      eventData,
    );
    aggregate.addEvent(event);
    aggregate.apply(event);

    return aggregate;
  }

  static fromEvents(events: DomainEvent[]): SubscriptionAggregate {
    if (events.length === 0) {
      throw new Error('Cannot create SubscriptionAggregate from empty events');
    }
    const aggregate = new SubscriptionAggregate(events[0].aggregateId);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  activate(provider: PaymentProvider, externalId: string): void {
    if (
      this.state.status !== SubscriptionStatus.TRIALING &&
      this.state.status !== SubscriptionStatus.PAST_DUE
    ) {
      throw new Error(
        `Cannot activate subscription in ${this.state.status} status`,
      );
    }

    const eventData: SubscriptionActivatedEventData = {
      subscriptionId: this.id,
      companyId: this.companyId,
      paymentProvider: provider,
      externalId,
    };

    const event = this.createEvent(
      SubscriptionEventType.Activated,
      eventData,
    );
    this.addEvent(event);
    this.apply(event);
  }

  changePlan(
    newPlanId: string,
    proratedAmount?: number,
    effectiveDate?: Date,
  ): void {
    if (
      this.state.status !== SubscriptionStatus.ACTIVE &&
      this.state.status !== SubscriptionStatus.TRIALING
    ) {
      throw new Error(
        `Cannot change plan for subscription in ${this.state.status} status`,
      );
    }

    if (newPlanId === this.state.planId) {
      throw new Error('New plan must be different from current plan');
    }

    const eventData: SubscriptionPlanChangedEventData = {
      subscriptionId: this.id,
      companyId: this.companyId,
      oldPlanId: this.state.planId,
      newPlanId,
      effectiveDate: (effectiveDate ?? new Date()).toISOString(),
      proratedAmount,
    };

    const event = this.createEvent(
      SubscriptionEventType.PlanChanged,
      eventData,
    );
    this.addEvent(event);
    this.apply(event);
  }

  recordUsage(
    usageType: UsageType,
    quantity: number = 1,
    entityType?: string,
    entityId?: string,
  ): void {
    if (
      this.state.status !== SubscriptionStatus.ACTIVE &&
      this.state.status !== SubscriptionStatus.TRIALING
    ) {
      throw new Error(
        `Cannot record usage for subscription in ${this.state.status} status`,
      );
    }

    const eventData: UsageRecordedEventData = {
      subscriptionId: this.id,
      companyId: this.companyId,
      usageType,
      quantity,
      entityType,
      entityId,
    };

    const event = this.createEvent(
      SubscriptionEventType.UsageRecorded,
      eventData,
    );
    this.addEvent(event);
    this.apply(event);

    // Check if limit reached
    if (this.planLimits) {
      const currentUsage = this.state.usageData[usageType] ?? 0;
      const newUsage = currentUsage + quantity;
      const limit = this.planLimits.getLimit(usageType);

      if (limit !== -1 && newUsage >= limit) {
        const limitEventData: UsageLimitReachedEventData = {
          subscriptionId: this.id,
          companyId: this.companyId,
          usageType,
          currentUsage: newUsage,
          limit,
        };

        const limitEvent = this.createEvent(
          SubscriptionEventType.UsageLimitReached,
          limitEventData,
        );
        this.addEvent(limitEvent);
        this.apply(limitEvent);
      }
    }
  }

  cancelAtPeriodEndFn(reason?: string): void {
    if (this.state.cancelAtPeriodEnd) {
      throw new Error('Subscription is already scheduled for cancellation');
    }

    if (
      this.state.status !== SubscriptionStatus.ACTIVE &&
      this.state.status !== SubscriptionStatus.TRIALING
    ) {
      throw new Error(
        `Cannot cancel subscription in ${this.state.status} status`,
      );
    }

    const eventData: SubscriptionCancellationScheduledEventData = {
      subscriptionId: this.id,
      companyId: this.companyId,
      cancelAtPeriodEnd: true,
      reason,
    };

    const event = this.createEvent(
      SubscriptionEventType.CancellationScheduled,
      eventData,
    );
    this.addEvent(event);
    this.apply(event);
  }

  cancelImmediately(reason?: string): void {
    if (this.state.status === SubscriptionStatus.CANCELLED) {
      throw new Error('Subscription is already cancelled');
    }

    const eventData: SubscriptionCancelledEventData = {
      subscriptionId: this.id,
      companyId: this.companyId,
      reason,
      cancelledAt: new Date().toISOString(),
    };

    const event = this.createEvent(
      SubscriptionEventType.Cancelled,
      eventData,
    );
    this.addEvent(event);
    this.apply(event);
  }

  renewPeriod(): void {
    if (this.state.status !== SubscriptionStatus.ACTIVE) {
      throw new Error(
        `Cannot renew subscription in ${this.state.status} status`,
      );
    }

    const newPeriod = BillingPeriod.create(
      this.state.currentPeriodEnd,
      this.state.billingCycle,
    );

    const eventData: SubscriptionRenewedEventData = {
      subscriptionId: this.id,
      companyId: this.companyId,
      newPeriodStart: newPeriod.start.toISOString(),
      newPeriodEnd: newPeriod.end.toISOString(),
    };

    const event = this.createEvent(
      SubscriptionEventType.Renewed,
      eventData,
    );
    this.addEvent(event);
    this.apply(event);
  }

  markPastDue(failedPaymentId?: string): void {
    if (this.state.status !== SubscriptionStatus.ACTIVE) {
      throw new Error(
        `Cannot mark subscription as past due from ${this.state.status} status`,
      );
    }

    const eventData: SubscriptionPastDueEventData = {
      subscriptionId: this.id,
      companyId: this.companyId,
      failedPaymentId,
    };

    const event = this.createEvent(
      SubscriptionEventType.PastDue,
      eventData,
    );
    this.addEvent(event);
    this.apply(event);
  }

  expire(): void {
    if (
      this.state.status !== SubscriptionStatus.PAST_DUE &&
      this.state.status !== SubscriptionStatus.TRIALING
    ) {
      throw new Error(
        `Cannot expire subscription from ${this.state.status} status`,
      );
    }

    const eventData: SubscriptionExpiredEventData = {
      subscriptionId: this.id,
      companyId: this.companyId,
      expiredAt: new Date().toISOString(),
    };

    const event = this.createEvent(
      SubscriptionEventType.Expired,
      eventData,
    );
    this.addEvent(event);
    this.apply(event);
  }

  isWithinLimit(usageType: UsageType): boolean {
    if (!this.planLimits) {
      return true; // No limits set, allow
    }
    const currentUsage = this.state.usageData[usageType] ?? 0;
    return this.planLimits.isWithinLimit(usageType, currentUsage);
  }

  getCurrentUsage(usageType: UsageType): number {
    return this.state.usageData[usageType] ?? 0;
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case SubscriptionEventType.Created:
        this.applySubscriptionCreated(
          event.data as SubscriptionCreatedEventData,
        );
        break;
      case SubscriptionEventType.Activated:
        this.applySubscriptionActivated(
          event.data as SubscriptionActivatedEventData,
        );
        break;
      case SubscriptionEventType.PlanChanged:
        this.applySubscriptionPlanChanged(
          event.data as SubscriptionPlanChangedEventData,
        );
        break;
      case SubscriptionEventType.UsageRecorded:
        this.applyUsageRecorded(event.data as UsageRecordedEventData);
        break;
      case SubscriptionEventType.CancellationScheduled:
        this.applySubscriptionCancellationScheduled(
          event.data as SubscriptionCancellationScheduledEventData,
        );
        break;
      case SubscriptionEventType.Cancelled:
        this.applySubscriptionCancelled(
          event.data as SubscriptionCancelledEventData,
        );
        break;
      case SubscriptionEventType.Renewed:
        this.applySubscriptionRenewed(
          event.data as SubscriptionRenewedEventData,
        );
        break;
      case SubscriptionEventType.PastDue:
        this.applySubscriptionPastDue();
        break;
      case SubscriptionEventType.Expired:
        this.applySubscriptionExpired();
        break;
      case SubscriptionEventType.UsageLimitReached:
        // No state change needed for this event
        break;
    }
  }

  private applySubscriptionCreated(data: SubscriptionCreatedEventData): void {
    this.state = {
      id: data.subscriptionId,
      companyId: data.companyId,
      planId: data.planId,
      status: data.status,
      billingCycle: data.billingCycle,
      currentPeriodStart: new Date(data.currentPeriodStart),
      currentPeriodEnd: new Date(data.currentPeriodEnd),
      trialEnd: data.trialEnd ? new Date(data.trialEnd) : undefined,
      cancelAtPeriodEnd: false,
      usageData: {},
    };
  }

  private applySubscriptionActivated(
    data: SubscriptionActivatedEventData,
  ): void {
    this.state.status = SubscriptionStatus.ACTIVE;
    this.state.paymentProvider = data.paymentProvider;
    this.state.externalId = data.externalId;
  }

  private applySubscriptionPlanChanged(
    data: SubscriptionPlanChangedEventData,
  ): void {
    this.state.planId = data.newPlanId;
  }

  private applyUsageRecorded(data: UsageRecordedEventData): void {
    const currentUsage = this.state.usageData[data.usageType] ?? 0;
    this.state.usageData[data.usageType] = currentUsage + data.quantity;
  }

  private applySubscriptionCancellationScheduled(
    data: SubscriptionCancellationScheduledEventData,
  ): void {
    this.state.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
    this.state.cancellationReason = data.reason;
  }

  private applySubscriptionCancelled(
    data: SubscriptionCancelledEventData,
  ): void {
    this.state.status = SubscriptionStatus.CANCELLED;
    this.state.cancelledAt = new Date(data.cancelledAt);
    this.state.cancellationReason = data.reason;
  }

  private applySubscriptionRenewed(data: SubscriptionRenewedEventData): void {
    this.state.currentPeriodStart = new Date(data.newPeriodStart);
    this.state.currentPeriodEnd = new Date(data.newPeriodEnd);
    this.state.usageData = {}; // Reset usage for new period
  }

  private applySubscriptionPastDue(): void {
    this.state.status = SubscriptionStatus.PAST_DUE;
  }

  private applySubscriptionExpired(): void {
    this.state.status = SubscriptionStatus.EXPIRED;
  }

  toJSON(): SubscriptionState & { version: number } {
    return {
      ...this.state,
      version: this.version,
    };
  }
}
