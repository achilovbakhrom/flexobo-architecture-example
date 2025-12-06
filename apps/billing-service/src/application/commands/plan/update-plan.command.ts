import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure, IAggregateStore } from '@flexobo/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PlanAggregate, UpdatePlanData } from '../../../domain/aggregates/plan.aggregate';
import { PlanFeature } from '../../../domain/constants/enums';
import { PlanLimitsData } from '../../../domain/value-objects/plan-limits.vo';
import { PLAN_AGGREGATE_STORE } from '../../../ports/plan.repository';

export interface UpdatePlanCommandData {
  planId: string;
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

export class UpdatePlanCommand implements ICommand {
  constructor(public readonly data: UpdatePlanCommandData) {}
}

@Injectable()
@CommandHandler(UpdatePlanCommand)
export class UpdatePlanCommandHandler
  implements ICommandHandler<UpdatePlanCommand, void>
{
  constructor(
    @Inject(PLAN_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<PlanAggregate>
  ) {}

  async execute(command: UpdatePlanCommand): Promise<Result<void, Error>> {
    try {
      const aggregate = await this.aggregateStore.load(command.data.planId);
      if (!aggregate) {
        return new Failure(new NotFoundException(`Plan ${command.data.planId} not found`));
      }

      const updateData: UpdatePlanData = {
        displayName: command.data.displayName,
        description: command.data.description,
        priceMonthly: command.data.priceMonthly,
        priceYearly: command.data.priceYearly,
        currency: command.data.currency,
        limits: command.data.limits,
        features: command.data.features,
        sortOrder: command.data.sortOrder,
        isPopular: command.data.isPopular,
        trialDays: command.data.trialDays,
      };

      aggregate.update(updateData);
      await this.aggregateStore.save(aggregate);
      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
