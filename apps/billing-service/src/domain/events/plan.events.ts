import { PlanFeature } from '../constants/enums';
import { PlanLimitsData } from '../value-objects/plan-limits.vo';

// Plan Event Types
export enum PlanEventType {
  Created = 'plan.created',
  Updated = 'plan.updated',
  Activated = 'plan.activated',
  Deactivated = 'plan.deactivated',
}

// Plan Event Data Types (use type for Record<string, unknown> compatibility)
export type PlanCreatedEventData = {
  planId: string;
  name: string;
  displayName: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  limits: PlanLimitsData;
  features: PlanFeature[];
  sortOrder: number;
  isPopular: boolean;
  trialDays: number;
  isActive: boolean;
};

export type PlanUpdatedEventData = {
  planId: string;
  displayName?: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  currency?: string;
  limits?: PlanLimitsData;
  features?: PlanFeature[];
  sortOrder?: number;
  isPopular?: boolean;
  trialDays?: number;
};

export type PlanActivatedEventData = {
  planId: string;
};

export type PlanDeactivatedEventData = {
  planId: string;
};

// Event interfaces for type discrimination
export type PlanCreatedEvent = {
  type: PlanEventType.Created;
  data: PlanCreatedEventData;
};

export type PlanUpdatedEvent = {
  type: PlanEventType.Updated;
  data: PlanUpdatedEventData;
};

export type PlanActivatedEvent = {
  type: PlanEventType.Activated;
  data: PlanActivatedEventData;
};

export type PlanDeactivatedEvent = {
  type: PlanEventType.Deactivated;
  data: PlanDeactivatedEventData;
};

// Union type of all plan events
export type PlanEvent =
  | PlanCreatedEvent
  | PlanUpdatedEvent
  | PlanActivatedEvent
  | PlanDeactivatedEvent;
