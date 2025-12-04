import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { IAggregateStore } from '@flexobo/core';
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SubscriptionAggregate } from '../../../domain/aggregates/subscription.aggregate';
import { BillingCycle } from '../../../domain/constants/enums';
import { SUBSCRIPTION_AGGREGATE_STORE, SUBSCRIPTION_READ_REPOSITORY, ISubscriptionReadRepository } from '../../../ports/subscription.repository';
import { PLAN_READ_REPOSITORY, IPlanReadRepository } from '../../../ports/plan.repository';

export interface CreateSubscriptionCommandData {
  companyId: string;
  planId: string;
  billingCycle: BillingCycle;
}

export class CreateSubscriptionCommand implements ICommand {
  constructor(public readonly data: CreateSubscriptionCommandData) {}
}

export interface CreateSubscriptionResult {
  id: string;
  companyId: string;
  planId: string;
  status: string;
  trialEnd?: Date;
}

@Injectable()
@CommandHandler(CreateSubscriptionCommand)
export class CreateSubscriptionCommandHandler
  implements ICommandHandler<CreateSubscriptionCommand, CreateSubscriptionResult>
{
  constructor(
    @Inject(SUBSCRIPTION_AGGREGATE_STORE)
    private readonly aggregateStore: IAggregateStore<SubscriptionAggregate>,
    @Inject(SUBSCRIPTION_READ_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionReadRepository,
    @Inject(PLAN_READ_REPOSITORY)
    private readonly planRepository: IPlanReadRepository
  ) {}

  async execute(command: CreateSubscriptionCommand): Promise<CreateSubscriptionResult> {
    // Check if company already has a subscription
    const existing = await this.subscriptionRepository.findByCompanyId(
      command.data.companyId
    );
    if (existing) {
      throw new BadRequestException('Company already has an active subscription');
    }

    // Get plan to check trial days
    const plan = await this.planRepository.findById(command.data.planId);
    if (!plan) {
      throw new BadRequestException(`Plan ${command.data.planId} not found`);
    }

    if (!plan.isActive) {
      throw new BadRequestException('Cannot subscribe to an inactive plan');
    }

    const id = uuidv4();
    const aggregate = SubscriptionAggregate.create({
      id,
      companyId: command.data.companyId,
      planId: command.data.planId,
      billingCycle: command.data.billingCycle,
      trialDays: plan.trialDays,
    });

    await this.aggregateStore.save(aggregate);

    return {
      id,
      companyId: aggregate.companyId,
      planId: aggregate.planId,
      status: aggregate.status,
      trialEnd: aggregate.trialEnd,
    };
  }
}
