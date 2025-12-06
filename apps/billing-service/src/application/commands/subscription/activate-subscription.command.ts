import { CommandHandler, ICommand, ICommandHandler, Result, Success, Failure, IAggregateStore } from '@flexobo/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionAggregate } from '../../../domain/aggregates/subscription.aggregate';
import { PaymentProvider } from '../../../domain/constants/enums';
import { SUBSCRIPTION_AGGREGATE_STORE } from '../../../ports/subscription.repository';

export class ActivateSubscriptionCommand implements ICommand {
  constructor(
    public readonly subscriptionId: string,
    public readonly paymentProvider: PaymentProvider,
    public readonly externalId: string,
  ) {}
}

@Injectable()
@CommandHandler(ActivateSubscriptionCommand)
export class ActivateSubscriptionCommandHandler
  implements ICommandHandler<ActivateSubscriptionCommand, void>
{
  constructor(
    @Inject(SUBSCRIPTION_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<SubscriptionAggregate>,
  ) {}

  async execute(command: ActivateSubscriptionCommand): Promise<Result<void, Error>> {
    try {
      const aggregate = await this.aggregateStore.load(command.subscriptionId);

      if (!aggregate) {
        return new Failure(new NotFoundException(
          `Subscription ${command.subscriptionId} not found`,
        ));
      }

      aggregate.activate(command.paymentProvider, command.externalId);
      await this.aggregateStore.save(aggregate);
      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
