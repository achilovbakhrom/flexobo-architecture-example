import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure, IAggregateStore } from '@flexobo/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PlanAggregate } from '../../../domain/aggregates/plan.aggregate';
import { PLAN_AGGREGATE_STORE } from '../../../ports/plan.repository';

export class DeactivatePlanCommand implements ICommand {
  constructor(public readonly planId: string) {}
}

@Injectable()
@CommandHandler(DeactivatePlanCommand)
export class DeactivatePlanCommandHandler
  implements ICommandHandler<DeactivatePlanCommand, void>
{
  constructor(
    @Inject(PLAN_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<PlanAggregate>
  ) {}

  async execute(command: DeactivatePlanCommand): Promise<Result<void, Error>> {
    try {
      const aggregate = await this.aggregateStore.load(command.planId);
      if (!aggregate) {
        return new Failure(new NotFoundException(`Plan ${command.planId} not found`));
      }

      aggregate.deactivate();
      await this.aggregateStore.save(aggregate);
      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
