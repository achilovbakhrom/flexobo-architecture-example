import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import { Inject, Injectable } from '@nestjs/common';
import { PLAN_READ_REPOSITORY, IPlanReadRepository, PlanReadData } from '../../../ports/plan.repository';

export interface ListPlansFilter {
  isActive?: boolean;
}

export class ListPlansQuery implements IQuery {
  constructor(public readonly filter?: ListPlansFilter) {}
}

@Injectable()
@QueryHandler(ListPlansQuery)
export class ListPlansQueryHandler
  implements IQueryHandler<ListPlansQuery, PlanReadData[]>
{
  constructor(
    @Inject(PLAN_READ_REPOSITORY)
    private readonly planRepository: IPlanReadRepository
  ) {}

  async execute(query: ListPlansQuery): Promise<PlanReadData[]> {
    if (query.filter?.isActive !== undefined) {
      return this.planRepository.findAll(query.filter.isActive);
    }
    return this.planRepository.findAll();
  }
}
