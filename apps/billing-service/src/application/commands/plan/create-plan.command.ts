import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IAggregateStore } from '@flexobo/core';
import { PlanAggregate, CreatePlanData } from '../../../domain/aggregates/plan.aggregate';
import { PlanFeature } from '../../../domain/constants/enums';
import { PlanLimitsData } from '../../../domain/value-objects/plan-limits.vo';
import { PLAN_AGGREGATE_STORE } from '../../../ports/plan.repository';

export interface CreatePlanCommandData {
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

export class CreatePlanCommand implements ICommand {
  constructor(public readonly data: CreatePlanCommandData) {}
}

export interface CreatePlanResult {
  id: string;
  name: string;
  displayName: string;
}

@Injectable()
@CommandHandler(CreatePlanCommand)
export class CreatePlanCommandHandler
  implements ICommandHandler<CreatePlanCommand, CreatePlanResult>
{
  constructor(
    @Inject(PLAN_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<PlanAggregate>
  ) {}

  async execute(command: CreatePlanCommand): Promise<CreatePlanResult> {
    const id = uuidv4();

    const createData: CreatePlanData = {
      id,
      name: command.data.name,
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

    const aggregate = PlanAggregate.create(createData);
    await this.aggregateStore.save(aggregate);

    return {
      id,
      name: aggregate.name,
      displayName: aggregate.displayName,
    };
  }
}
