import { PlanFeature } from '../domain/constants/enums';
import { PlanLimitsData } from '../domain/value-objects/plan-limits.vo';

export const PLAN_AGGREGATE_STORE = Symbol('PLAN_AGGREGATE_STORE');
export const PLAN_READ_REPOSITORY = Symbol('PLAN_READ_REPOSITORY');

export interface PlanReadData {
  id: string;
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
  isActive: boolean;
  trialDays: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlanReadRepository {
  findById(id: string): Promise<PlanReadData | null>;
  findByName(name: string): Promise<PlanReadData | null>;
  findAll(isActive?: boolean): Promise<PlanReadData[]>;
  findActive(): Promise<PlanReadData[]>;
  save(plan: PlanReadData): Promise<void>;
  update(id: string, data: Partial<PlanReadData>): Promise<void>;
}
