import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import {
  GetSubscriptionByCompanyQuery,
  CheckUsageLimitQuery,
  CheckUsageLimitResult,
  SubscriptionDto,
} from '../../application/queries/subscription';
import { GetPlanQuery } from '../../application/queries/plan';
import { PlanReadData } from '../../ports/plan.repository';
import { RecordUsageCommand } from '../../application/commands/subscription';
import { UsageType } from '../../domain/constants/enums';

// Request/Response interfaces matching proto
interface CheckLimitRequest {
  companyId: string;
  usageType: string;
  quantity: number;
}

interface CheckLimitResponse {
  allowed: boolean;
  reason: string;
  currentUsage: number;
  limit: number;
  remaining: number;
}

interface GetPlanRequest {
  companyId: string;
}

interface GetPlanResponse {
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
}

interface RecordUsageRequest {
  companyId: string;
  usageType: string;
  quantity: number;
  entityType?: string;
  entityId?: string;
}

interface RecordUsageResponse {
  success: boolean;
  newUsage: number;
  limit: number;
  remaining: number;
}

interface GetUsageStatsRequest {
  companyId: string;
}

interface UsageStat {
  current: number;
  limit: number;
  remaining: number;
}

interface GetUsageStatsResponse {
  found: boolean;
  usage: Record<string, UsageStat>;
}

@Controller()
export class BillingGrpcController {
  private readonly logger = new Logger(BillingGrpcController.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @GrpcMethod('BillingService', 'CheckSubscriptionLimit')
  async checkSubscriptionLimit(
    request: CheckLimitRequest,
  ): Promise<CheckLimitResponse> {
    this.logger.debug(
      `CheckSubscriptionLimit: company=${request.companyId}, type=${request.usageType}`,
    );

    try {
      const result = await this.queryBus.execute<
        CheckUsageLimitQuery,
        CheckUsageLimitResult
      >(
        new CheckUsageLimitQuery({
          companyId: request.companyId,
          usageType: request.usageType as UsageType,
        }),
      );

      return {
        allowed: result.allowed,
        reason: '',
        currentUsage: result.currentUsage,
        limit: result.limit,
        remaining: result.remaining,
      };
    } catch (error) {
      this.logger.error(`CheckSubscriptionLimit error: ${error}`);
      return {
        allowed: false,
        reason: 'Internal error checking subscription limit',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
      };
    }
  }

  @GrpcMethod('BillingService', 'GetSubscriptionPlan')
  async getSubscriptionPlan(request: GetPlanRequest): Promise<GetPlanResponse> {
    this.logger.debug(`GetSubscriptionPlan: company=${request.companyId}`);

    try {
      const subscription = await this.queryBus.execute<
        GetSubscriptionByCompanyQuery,
        SubscriptionDto | null
      >(new GetSubscriptionByCompanyQuery(request.companyId));

      if (!subscription) {
        return { found: false };
      }

      const plan = await this.queryBus.execute<GetPlanQuery, PlanReadData | null>(
        new GetPlanQuery(subscription.planId),
      );

      if (!plan) {
        return { found: false };
      }

      return {
        found: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          currentPeriodStart: subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          trialEnd: subscription.trialEnd?.toISOString() ?? '',
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        },
        plan: {
          id: plan.id,
          name: plan.name,
          displayName: plan.displayName,
          features: plan.features,
          limits: plan.limits,
        },
      };
    } catch (error) {
      this.logger.error(`GetSubscriptionPlan error: ${error}`);
      return { found: false };
    }
  }

  @GrpcMethod('BillingService', 'RecordUsage')
  async recordUsage(request: RecordUsageRequest): Promise<RecordUsageResponse> {
    this.logger.debug(
      `RecordUsage: company=${request.companyId}, type=${request.usageType}, qty=${request.quantity}`,
    );

    try {
      // Get subscription
      const subscription = await this.queryBus.execute<
        GetSubscriptionByCompanyQuery,
        SubscriptionDto | null
      >(new GetSubscriptionByCompanyQuery(request.companyId));

      if (!subscription) {
        return {
          success: false,
          newUsage: 0,
          limit: 0,
          remaining: 0,
        };
      }

      // Record usage
      await this.commandBus.execute(
        new RecordUsageCommand({
          companyId: request.companyId,
          usageType: request.usageType as UsageType,
          quantity: request.quantity || 1,
          entityType: request.entityType,
          entityId: request.entityId,
        }),
      );

      // Get updated usage stats
      const usageResult = await this.queryBus.execute<
        CheckUsageLimitQuery,
        CheckUsageLimitResult
      >(
        new CheckUsageLimitQuery({
          companyId: request.companyId,
          usageType: request.usageType as UsageType,
        }),
      );

      return {
        success: true,
        newUsage: usageResult.currentUsage,
        limit: usageResult.limit,
        remaining: usageResult.remaining,
      };
    } catch (error) {
      this.logger.error(`RecordUsage error: ${error}`);
      return {
        success: false,
        newUsage: 0,
        limit: 0,
        remaining: 0,
      };
    }
  }

  @GrpcMethod('BillingService', 'GetUsageStats')
  async getUsageStats(
    request: GetUsageStatsRequest,
  ): Promise<GetUsageStatsResponse> {
    this.logger.debug(`GetUsageStats: company=${request.companyId}`);

    try {
      const subscription = await this.queryBus.execute<
        GetSubscriptionByCompanyQuery,
        SubscriptionDto | null
      >(new GetSubscriptionByCompanyQuery(request.companyId));

      if (!subscription) {
        return { found: false, usage: {} };
      }

      const plan = await this.queryBus.execute<GetPlanQuery, PlanReadData | null>(
        new GetPlanQuery(subscription.planId),
      );

      if (!plan) {
        return { found: false, usage: {} };
      }

      // Build usage stats for all tracked types
      const usageTypes = Object.values(UsageType);
      const usage: Record<string, UsageStat> = {};

      for (const usageType of usageTypes) {
        const result = await this.queryBus.execute<
          CheckUsageLimitQuery,
          CheckUsageLimitResult
        >(
          new CheckUsageLimitQuery({
            companyId: request.companyId,
            usageType,
          }),
        );

        usage[usageType] = {
          current: result.currentUsage,
          limit: result.limit,
          remaining: result.remaining,
        };
      }

      return { found: true, usage };
    } catch (error) {
      this.logger.error(`GetUsageStats error: ${error}`);
      return { found: false, usage: {} };
    }
  }
}
