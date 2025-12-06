import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { IAggregateStore } from '@flexobo/core';
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

  async execute(command: ActivatePlanCommand): Promise<void> {
    const aggregate = await this.aggregateStore.load(command.planId);
    if (!aggregate) {
      throw new NotFoundException(`Plan ${command.planId} not found`);
    }

    aggregate.activate();
    await this.aggregateStore.save(aggregate);
  }
}
