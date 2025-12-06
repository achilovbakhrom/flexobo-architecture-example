import { Injectable, Logger, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IBillingClient,
  UsageType,
  CheckLimitResult,
  RecordUsageResult,
  SubscriptionPlanResult,
  UsageStatsResult,
} from './interfaces';

interface BillingGrpcClient {
  checkSubscriptionLimit(request: {
    companyId: string;
    usageType: string;
    quantity: number;
  }): Promise<{
    allowed: boolean;
    reason: string;
    currentUsage: number;
    limit: number;
    remaining: number;
  }>;

  getSubscriptionPlan(request: { companyId: string }): Promise<{
    found: boolean;
    subscription?: {
      id: string;
      status: string;
      billingCycle: string;
      currentPeriodStart: string;
      currentPeriodEnd: string;
      trialEnd: string;
      cancelAtPeriodEnd: boolean;
    };
    plan?: {
      id: string;
      name: string;
      displayName: string;
      features: string[];
      limits: {
        loadsPerMonth: number;
        tripsPerMonth: number;
        bidsPerMonth: number;
        teamMembers: number;
        storageGb: number;
        apiRequestsPerDay: number;
      };
    };
  }>;

  recordUsage(request: {
    companyId: string;
    usageType: string;
    quantity: number;
    entityType?: string;
    entityId?: string;
  }): Promise<{
    success: boolean;
    newUsage: number;
    limit: number;
    remaining: number;
  }>;

  getUsageStats(request: { companyId: string }): Promise<{
    found: boolean;
    usage: Record<string, { current: number; limit: number; remaining: number }>;
  }>;
}

@Injectable()
export class BillingClientService implements IBillingClient, OnModuleInit {
  private readonly logger = new Logger(BillingClientService.name);
  private client: BillingGrpcClient | null = null;
  private billingEnabled: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject('BILLING_GRPC_CLIENT') private grpcClient?: BillingGrpcClient
  ) {}

  async onModuleInit(): Promise<void> {
    const billingUrl = this.configService.get<string>('BILLING_SERVICE_URL');

    if (!billingUrl && !this.grpcClient) {
      this.logger.warn('Billing service URL not configured. Billing checks will be bypassed.');
      this.billingEnabled = false;
      return;
    }

    if (this.grpcClient) {
      this.client = this.grpcClient;
      this.billingEnabled = true;
      this.logger.log('Billing client initialized with injected gRPC client');
    } else {
      // In a real implementation, we would dynamically create the gRPC client here
      // For now, we'll use the injected client pattern
      this.billingEnabled = false;
      this.logger.warn('Billing gRPC client not injected. Billing checks will be bypassed.');
    }
  }

  private getDefaultAllowedResult(): CheckLimitResult {
    return {
      allowed: true,
      currentUsage: 0,
      limit: -1, // Unlimited
      remaining: -1,
    };
  }

  async checkLimit(
    companyId: string,
    usageType: UsageType,
    quantity: number = 1
  ): Promise<CheckLimitResult> {
    if (!this.billingEnabled || !this.client) {
      return this.getDefaultAllowedResult();
    }

    try {
      const response = await this.client.checkSubscriptionLimit({
        companyId,
        usageType,
        quantity,
      });

      return {
        allowed: response.allowed,
        reason: response.reason || undefined,
        currentUsage: response.currentUsage,
        limit: response.limit,
        remaining: response.remaining,
      };
    } catch (error) {
      this.logger.error(`Failed to check limit: ${error}`);
      // Fail open - allow action if billing service is unavailable
      return this.getDefaultAllowedResult();
    }
  }

  async recordUsage(
    companyId: string,
    usageType: UsageType,
    quantity: number = 1,
    entityType?: string,
    entityId?: string
  ): Promise<RecordUsageResult> {
    if (!this.billingEnabled || !this.client) {
      return {
        success: true,
        newUsage: 0,
        limit: -1,
        remaining: -1,
      };
    }

    try {
      const response = await this.client.recordUsage({
        companyId,
        usageType,
        quantity,
        entityType,
        entityId,
      });

      return {
        success: response.success,
        newUsage: response.newUsage,
        limit: response.limit,
        remaining: response.remaining,
      };
    } catch (error) {
      this.logger.error(`Failed to record usage: ${error}`);
      return {
        success: false,
        newUsage: 0,
        limit: 0,
        remaining: 0,
      };
    }
  }

  async getSubscriptionPlan(companyId: string): Promise<SubscriptionPlanResult> {
    if (!this.billingEnabled || !this.client) {
      return { found: false };
    }

    try {
      const response = await this.client.getSubscriptionPlan({ companyId });

      if (!response.found || !response.subscription || !response.plan) {
        return { found: false };
      }

      return {
        found: true,
        subscription: {
          id: response.subscription.id,
          status: response.subscription.status,
          billingCycle: response.subscription.billingCycle,
          currentPeriodStart: new Date(response.subscription.currentPeriodStart),
          currentPeriodEnd: new Date(response.subscription.currentPeriodEnd),
          trialEnd: response.subscription.trialEnd
            ? new Date(response.subscription.trialEnd)
            : undefined,
          cancelAtPeriodEnd: response.subscription.cancelAtPeriodEnd,
        },
        plan: {
          id: response.plan.id,
          name: response.plan.name,
          displayName: response.plan.displayName,
          features: response.plan.features,
          limits: response.plan.limits,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription plan: ${error}`);
      return { found: false };
    }
  }

  async getUsageStats(companyId: string): Promise<UsageStatsResult> {
    if (!this.billingEnabled || !this.client) {
      return { found: false, usage: {} };
    }

    try {
      const response = await this.client.getUsageStats({ companyId });
      return {
        found: response.found,
        usage: response.usage,
      };
    } catch (error) {
      this.logger.error(`Failed to get usage stats: ${error}`);
      return { found: false, usage: {} };
    }
  }

  async hasActiveSubscription(companyId: string): Promise<boolean> {
    if (!this.billingEnabled) {
      return true; // Allow if billing not enabled
    }

    const result = await this.getSubscriptionPlan(companyId);
    if (!result.found || !result.subscription) {
      return false;
    }

    return ['ACTIVE', 'TRIALING'].includes(result.subscription.status);
  }

  async canPerformAction(
    companyId: string,
    usageType: UsageType,
    quantity: number = 1
  ): Promise<boolean> {
    const result = await this.checkLimit(companyId, usageType, quantity);
    return result.allowed;
  }
}
