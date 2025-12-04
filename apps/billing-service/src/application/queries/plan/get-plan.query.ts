import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PLAN_READ_REPOSITORY, IPlanReadRepository, PlanReadData } from '../../../ports/plan.repository';

export class GetPlanQuery implements IQuery {
  constructor(public readonly planId: string) {}
}

@Injectable()
@QueryHandler(GetPlanQuery)
export class GetPlanQueryHandler
  implements IQueryHandler<GetPlanQuery, PlanReadData>
{
  constructor(
    @Inject(PLAN_READ_REPOSITORY)
    private readonly planRepository: IPlanReadRepository
  ) {}

  async execute(query: GetPlanQuery): Promise<PlanReadData> {
    const plan = await this.planRepository.findById(query.planId);
    if (!plan) {
      throw new NotFoundException(`Plan ${query.planId} not found`);
    }
    return plan;
  }
}
