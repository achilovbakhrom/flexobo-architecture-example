import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SUBSCRIPTION_READ_REPOSITORY, ISubscriptionReadRepository, SubscriptionReadData } from '../../../ports/subscription.repository';

export class GetSubscriptionQuery implements IQuery {
  constructor(public readonly subscriptionId: string) {}
}

@Injectable()
@QueryHandler(GetSubscriptionQuery)
export class GetSubscriptionQueryHandler
  implements IQueryHandler<GetSubscriptionQuery, SubscriptionReadData>
{
  constructor(
    @Inject(SUBSCRIPTION_READ_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionReadRepository
  ) {}

  async execute(query: GetSubscriptionQuery): Promise<SubscriptionReadData> {
    const subscription = await this.subscriptionRepository.findById(
      query.subscriptionId
    );
    if (!subscription) {
      throw new NotFoundException(
        `Subscription ${query.subscriptionId} not found`
      );
    }
    return subscription;
  }
}
