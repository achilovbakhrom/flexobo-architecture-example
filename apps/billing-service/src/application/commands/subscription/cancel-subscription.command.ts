import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { IAggregateStore } from '@flexobo/core';
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

  async execute(command: CancelSubscriptionCommand): Promise<void> {
    const aggregate = await this.aggregateStore.load(command.data.subscriptionId);
    if (!aggregate) {
      throw new NotFoundException(
        `Subscription ${command.data.subscriptionId} not found`
      );
    }

    if (command.data.immediate) {
      aggregate.cancelImmediately(command.data.reason);
    } else {
      aggregate.cancelAtPeriodEndFn(command.data.reason);
    }

    await this.aggregateStore.save(aggregate);
  }
}
