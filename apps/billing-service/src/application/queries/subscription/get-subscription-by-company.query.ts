import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SUBSCRIPTION_READ_REPOSITORY, ISubscriptionReadRepository, SubscriptionReadData } from '../../../ports/subscription.repository';

export class GetSubscriptionByCompanyQuery implements IQuery {
  constructor(public readonly companyId: string) {}
}

@Injectable()
@QueryHandler(GetSubscriptionByCompanyQuery)
export class GetSubscriptionByCompanyQueryHandler
  implements IQueryHandler<GetSubscriptionByCompanyQuery, SubscriptionReadData>
{
  constructor(
    @Inject(SUBSCRIPTION_READ_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionReadRepository
  ) {}

  async execute(
    query: GetSubscriptionByCompanyQuery
  ): Promise<SubscriptionReadData> {
    const subscription = await this.subscriptionRepository.findByCompanyId(
      query.companyId
    );
    if (!subscription) {
      throw new NotFoundException(
        `No subscription found for company ${query.companyId}`
      );
    }
    return subscription;
  }
}
