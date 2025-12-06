import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure, IAggregateStore } from '@flexobo/core';
import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionAggregate } from '../../../domain/aggregates/subscription.aggregate';
import { SUBSCRIPTION_AGGREGATE_STORE } from '../../../ports/subscription.repository';
import { PLAN_READ_REPOSITORY, IPlanReadRepository } from '../../../ports/plan.repository';

export interface ChangePlanCommandData {
  subscriptionId: string;
  newPlanId: string;
}

export class ChangePlanCommand implements ICommand {
  constructor(public readonly data: ChangePlanCommandData) {}
}

@Injectable()
@CommandHandler(ChangePlanCommand)
export class ChangePlanCommandHandler
  implements ICommandHandler<ChangePlanCommand, void>
{
  constructor(
    @Inject(SUBSCRIPTION_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<SubscriptionAggregate>,
    @Inject(PLAN_READ_REPOSITORY)
    private readonly planRepository: IPlanReadRepository
  ) {}

  async execute(command: ChangePlanCommand): Promise<Result<void, Error>> {
    try {
      const aggregate = await this.aggregateStore.load(command.data.subscriptionId);
      if (!aggregate) {
        return new Failure(new NotFoundException(
          `Subscription ${command.data.subscriptionId} not found`
        ));
      }

      // Validate new plan exists and is active
      const newPlan = await this.planRepository.findById(command.data.newPlanId);
      if (!newPlan) {
        return new Failure(new BadRequestException(`Plan ${command.data.newPlanId} not found`));
      }

      if (!newPlan.isActive) {
        return new Failure(new BadRequestException('Cannot change to an inactive plan'));
      }

      // TODO: Calculate proration if needed
      const proratedAmount = undefined;

      aggregate.changePlan(command.data.newPlanId, proratedAmount);
      await this.aggregateStore.save(aggregate);
      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
