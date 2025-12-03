export * from './get-plan.query';
export * from './list-plans.query';

// Re-export types for convenience
export { PlanReadData as PlanDto, IPlanReadRepository } from '../../../ports/plan.repository';

// Result type for list queries
export interface PlanListResult {
  items: import('../../../ports/plan.repository').PlanReadData[];
  total: number;
  page: number;
  pageSize: number;
}

import { GetPlanQueryHandler } from './get-plan.query';
import { ListPlansQueryHandler } from './list-plans.query';

export const PlanQueryHandlers = [
  GetPlanQueryHandler,
  ListPlansQueryHandler,
];
