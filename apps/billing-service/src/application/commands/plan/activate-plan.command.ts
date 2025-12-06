import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure, IAggregateStore } from '@flexobo/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PlanAggregate } from '../../../domain/aggregates/plan.aggregate';
import { PLAN_AGGREGATE_STORE } from '../../../ports/plan.repository';

export class ActivatePlanCommand implements ICommand {
  constructor(public readonly planId: string) {}
}

@Injectable()
@CommandHandler(ActivatePlanCommand)
export class ActivatePlanCommandHandler
  implements ICommandHandler<ActivatePlanCommand, void>
{
  constructor(
    @Inject(PLAN_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<PlanAggregate>
  ) {}

  async execute(command: ActivatePlanCommand): Promise<Result<void, Error>> {
    try {
      const aggregate = await this.aggregateStore.load(command.planId);
      if (!aggregate) {
        return new Failure(new NotFoundException(`Plan ${command.planId} not found`));
      }

      aggregate.activate();
      await this.aggregateStore.save(aggregate);
      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
