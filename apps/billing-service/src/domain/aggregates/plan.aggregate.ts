import { v4 as uuid } from 'uuid';
import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { PlanFeature } from '../constants/enums';
import {
  PlanEventType,
  PlanCreatedEvent,
  PlanUpdatedEvent,
  PlanCreatedEventData,
  PlanUpdatedEventData,
} from '../events/plan.events';
import { PlanLimits, PlanLimitsData } from '../value-objects/plan-limits.vo';
import { Money } from '../value-objects/money.vo';

export interface PlanState {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  priceMonthly: Money;
  priceYearly: Money;
  limits: PlanLimits;
  features: PlanFeature[];
  sortOrder: number;
  isPopular: boolean;
  isActive: boolean;
  trialDays: number;
}

export interface CreatePlanData {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  currency?: string;
  limits: Partial<PlanLimitsData>;
  features: PlanFeature[];
  sortOrder?: number;
  isPopular?: boolean;
  trialDays?: number;
}

export interface UpdatePlanData {
  displayName?: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  currency?: string;
  limits?: Partial<PlanLimitsData>;
  features?: PlanFeature[];
  sortOrder?: number;
  isPopular?: boolean;
  trialDays?: number;
}

export class PlanAggregate extends AggregateRoot {
  private state!: PlanState;

  get planId(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get displayName(): string {
    return this.state.displayName;
  }

  get description(): string | undefined {
    return this.state.description;
  }

  get priceMonthly(): Money {
    return this.state.priceMonthly;
  }

  get priceYearly(): Money {
    return this.state.priceYearly;
  }

  get limits(): PlanLimits {
    return this.state.limits;
  }

  get features(): PlanFeature[] {
    return this.state.features;
  }

  get sortOrder(): number {
    return this.state.sortOrder;
  }

  get isPopular(): boolean {
    return this.state.isPopular;
  }

  get isActive(): boolean {
    return this.state.isActive;
  }

  get trialDays(): number {
    return this.state.trialDays;
  }

  static create(data: CreatePlanData): PlanAggregate {
    const id = data.id ?? uuid();
    const aggregate = new PlanAggregate(id);
    const currency = data.currency ?? 'USD';

    const eventData: PlanCreatedEventData = {
      planId: id,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      priceMonthly: data.priceMonthly,
      priceYearly: data.priceYearly,
      currency,
      limits: PlanLimits.create(data.limits).toJSON(),
      features: data.features,
      sortOrder: data.sortOrder ?? 0,
      isPopular: data.isPopular ?? false,
      trialDays: data.trialDays ?? 0,
      isActive: true,
    };

    const event = aggregate.createEvent(PlanEventType.Created, eventData);
    aggregate.addEvent(event);
    aggregate.apply(event);
    return aggregate;
  }

  static fromEvents(events: DomainEvent[]): PlanAggregate {
    if (events.length === 0) {
      throw new Error('Cannot create PlanAggregate from empty events');
    }
    const aggregate = new PlanAggregate(events[0].aggregateId);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  update(data: UpdatePlanData): void {
    if (!this.state.isActive) {
      throw new Error('Cannot update an inactive plan');
    }

    const eventData: PlanUpdatedEventData = {
      planId: this.id,
      ...data,
      limits: data.limits ? PlanLimits.create(data.limits).toJSON() : undefined,
    };

    const event = this.createEvent(PlanEventType.Updated, eventData);
    this.addEvent(event);
    this.apply(event);
  }

  activate(): void {
    if (this.state.isActive) {
      throw new Error('Plan is already active');
    }

    const event = this.createEvent(PlanEventType.Activated, {
      planId: this.id,
    });
    this.addEvent(event);
    this.apply(event);
  }

  deactivate(): void {
    if (!this.state.isActive) {
      throw new Error('Plan is already inactive');
    }

    const event = this.createEvent(PlanEventType.Deactivated, {
      planId: this.id,
    });
    this.addEvent(event);
    this.apply(event);
  }

  hasFeature(feature: PlanFeature): boolean {
    return this.state.features.includes(feature);
  }

  getPrice(yearly: boolean): Money {
    return yearly ? this.state.priceYearly : this.state.priceMonthly;
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case PlanEventType.Created:
        this.applyPlanCreated(event.data as PlanCreatedEventData);
        break;
      case PlanEventType.Updated:
        this.applyPlanUpdated(event.data as PlanUpdatedEventData);
        break;
      case PlanEventType.Activated:
        this.applyPlanActivated();
        break;
      case PlanEventType.Deactivated:
        this.applyPlanDeactivated();
        break;
    }
  }

  private applyPlanCreated(data: PlanCreatedEventData): void {
    this.state = {
      id: data.planId,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      priceMonthly: Money.create(data.priceMonthly, data.currency),
      priceYearly: Money.create(data.priceYearly, data.currency),
      limits: PlanLimits.create(data.limits),
      features: data.features,
      sortOrder: data.sortOrder,
      isPopular: data.isPopular,
      isActive: data.isActive,
      trialDays: data.trialDays,
    };
  }

  private applyPlanUpdated(data: PlanUpdatedEventData): void {
    if (data.displayName !== undefined) {
      this.state.displayName = data.displayName;
    }
    if (data.description !== undefined) {
      this.state.description = data.description;
    }
    if (data.priceMonthly !== undefined) {
      this.state.priceMonthly = Money.create(
        data.priceMonthly,
        data.currency ?? this.state.priceMonthly.currency,
      );
    }
    if (data.priceYearly !== undefined) {
      this.state.priceYearly = Money.create(
        data.priceYearly,
        data.currency ?? this.state.priceYearly.currency,
      );
    }
    if (data.limits !== undefined) {
      this.state.limits = PlanLimits.create(data.limits);
    }
    if (data.features !== undefined) {
      this.state.features = data.features;
    }
    if (data.sortOrder !== undefined) {
      this.state.sortOrder = data.sortOrder;
    }
    if (data.isPopular !== undefined) {
      this.state.isPopular = data.isPopular;
    }
    if (data.trialDays !== undefined) {
      this.state.trialDays = data.trialDays;
    }
  }

  private applyPlanActivated(): void {
    this.state.isActive = true;
  }

  private applyPlanDeactivated(): void {
    this.state.isActive = false;
  }

  toJSON(): PlanState & { version: number } {
    return {
      ...this.state,
      version: this.version,
    };
  }
}
