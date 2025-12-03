import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UsageType } from '../../../domain/constants/enums';
import { PlanLimits } from '../../../domain/value-objects/plan-limits.vo';
import { SUBSCRIPTION_READ_REPOSITORY, ISubscriptionReadRepository } from '../../../ports/subscription.repository';
import { PLAN_READ_REPOSITORY, IPlanReadRepository } from '../../../ports/plan.repository';

export interface CheckUsageLimitQueryData {
  companyId: string;
  usageType: UsageType;
}

export class CheckUsageLimitQuery implements IQuery {
  constructor(public readonly data: CheckUsageLimitQueryData) {}
}

export interface CheckUsageLimitResult {
  allowed: boolean;
  currentUsage: number;
  limit: number; // -1 for unlimited
  remaining: number; // -1 for unlimited
}

@Injectable()
@QueryHandler(CheckUsageLimitQuery)
export class CheckUsageLimitQueryHandler
  implements IQueryHandler<CheckUsageLimitQuery, CheckUsageLimitResult>
{
  constructor(
    @Inject(SUBSCRIPTION_READ_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionReadRepository,
    @Inject(PLAN_READ_REPOSITORY)
    private readonly planRepository: IPlanReadRepository
  ) {}

  async execute(query: CheckUsageLimitQuery): Promise<CheckUsageLimitResult> {
    const subscription = await this.subscriptionRepository.findByCompanyId(
      query.data.companyId
    );
    if (!subscription) {
      throw new NotFoundException(
        `No subscription found for company ${query.data.companyId}`
      );
    }

    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) {
      throw new NotFoundException(`Plan ${subscription.planId} not found`);
    }

    const limits = PlanLimits.create(plan.limits);
    const currentUsage = subscription.usageData[query.data.usageType] ?? 0;
    const limit = limits.getLimit(query.data.usageType);
    const allowed = limits.isWithinLimit(query.data.usageType, currentUsage);
    const remaining = limit === -1 ? -1 : Math.max(0, limit - currentUsage);

    return {
      allowed,
      currentUsage,
      limit,
      remaining,
    };
  }
}
