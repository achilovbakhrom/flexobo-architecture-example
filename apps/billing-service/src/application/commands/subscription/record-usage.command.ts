import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure, IAggregateStore } from '@flexobo/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionAggregate } from '../../../domain/aggregates/subscription.aggregate';
import { UsageType } from '../../../domain/constants/enums';
import { PlanLimits } from '../../../domain/value-objects/plan-limits.vo';
import { SUBSCRIPTION_AGGREGATE_STORE, SUBSCRIPTION_READ_REPOSITORY, ISubscriptionReadRepository } from '../../../ports/subscription.repository';
import { PLAN_READ_REPOSITORY, IPlanReadRepository } from '../../../ports/plan.repository';

export interface RecordUsageCommandData {
  companyId: string;
  usageType: UsageType;
  quantity?: number;
  entityType?: string;
  entityId?: string;
}

export class RecordUsageCommand implements ICommand {
  constructor(public readonly data: RecordUsageCommandData) {}
}

@Injectable()
@CommandHandler(RecordUsageCommand)
export class RecordUsageCommandHandler
  implements ICommandHandler<RecordUsageCommand, void>
{
  constructor(
    @Inject(SUBSCRIPTION_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<SubscriptionAggregate>,
    @Inject(SUBSCRIPTION_READ_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionReadRepository,
    @Inject(PLAN_READ_REPOSITORY)
    private readonly planRepository: IPlanReadRepository
  ) {}

  async execute(command: RecordUsageCommand): Promise<Result<void, Error>> {
    try {
      // Find subscription by company
      const subscriptionData = await this.subscriptionRepository.findByCompanyId(
        command.data.companyId
      );
      if (!subscriptionData) {
        return new Failure(new NotFoundException(
          `No subscription found for company ${command.data.companyId}`
        ));
      }

      const aggregate = await this.aggregateStore.load(subscriptionData.id);
      if (!aggregate) {
        return new Failure(new NotFoundException(
          `Subscription ${subscriptionData.id} not found`
        ));
      }

      // Load plan limits
      const plan = await this.planRepository.findById(aggregate.planId);
      if (plan) {
        aggregate.setPlanLimits(PlanLimits.create(plan.limits));
      }

      aggregate.recordUsage(
        command.data.usageType,
        command.data.quantity ?? 1,
        command.data.entityType,
        command.data.entityId
      );

      await this.aggregateStore.save(aggregate);
      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
