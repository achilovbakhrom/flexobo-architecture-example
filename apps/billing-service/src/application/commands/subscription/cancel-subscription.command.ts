import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure, IAggregateStore } from '@flexobo/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionAggregate } from '../../../domain/aggregates/subscription.aggregate';
import { SUBSCRIPTION_AGGREGATE_STORE } from '../../../ports/subscription.repository';

export interface CancelSubscriptionCommandData {
  subscriptionId: string;
  reason?: string;
  immediate?: boolean;
}

export class CancelSubscriptionCommand implements ICommand {
  constructor(public readonly data: CancelSubscriptionCommandData) {}
}

@Injectable()
@CommandHandler(CancelSubscriptionCommand)
export class CancelSubscriptionCommandHandler
  implements ICommandHandler<CancelSubscriptionCommand, void>
{
  constructor(
    @Inject(SUBSCRIPTION_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<SubscriptionAggregate>
  ) {}

  async execute(command: CancelSubscriptionCommand): Promise<Result<void, Error>> {
    try {
      const aggregate = await this.aggregateStore.load(command.data.subscriptionId);
      if (!aggregate) {
        return new Failure(new NotFoundException(
          `Subscription ${command.data.subscriptionId} not found`
        ));
      }

      if (command.data.immediate) {
        aggregate.cancelImmediately(command.data.reason);
      } else {
        aggregate.cancelAtPeriodEndFn(command.data.reason);
      }

      await this.aggregateStore.save(aggregate);
      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
