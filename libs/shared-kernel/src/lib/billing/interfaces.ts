export type UsageType =
  | 'LOADS_CREATED'
  | 'TRIPS_CREATED'
  | 'BIDS_PLACED'
  | 'TEAM_MEMBERS'
  | 'STORAGE_GB'
  | 'API_REQUESTS';

export interface PlanLimits {
  loadsPerMonth: number;
  tripsPerMonth: number;
  bidsPerMonth: number;
  teamMembers: number;
  storageGb: number;
  apiRequestsPerDay: number;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
}

export interface PlanInfo {
  id: string;
  name: string;
  displayName: string;
  features: string[];
  limits: PlanLimits;
}

export interface UsageStat {
  current: number;
  limit: number;
  remaining: number;
}

export interface CheckLimitResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  remaining: number;
}

export interface RecordUsageResult {
  success: boolean;
  newUsage: number;
  limit: number;
  remaining: number;
}

export interface SubscriptionPlanResult {
  found: boolean;
  subscription?: SubscriptionInfo;
  plan?: PlanInfo;
}

export interface UsageStatsResult {
  found: boolean;
  usage: Record<string, UsageStat>;
}

export interface IBillingClient {
  checkLimit(
    companyId: string,
    usageType: UsageType,
    quantity?: number
  ): Promise<CheckLimitResult>;

  recordUsage(
    companyId: string,
    usageType: UsageType,
    quantity?: number,
    entityType?: string,
    entityId?: string
  ): Promise<RecordUsageResult>;

  getSubscriptionPlan(companyId: string): Promise<SubscriptionPlanResult>;

  getUsageStats(companyId: string): Promise<UsageStatsResult>;

  hasActiveSubscription(companyId: string): Promise<boolean>;

  canPerformAction(
    companyId: string,
    usageType: UsageType,
    quantity?: number
  ): Promise<boolean>;
}

export const BILLING_CLIENT = Symbol('BILLING_CLIENT');
