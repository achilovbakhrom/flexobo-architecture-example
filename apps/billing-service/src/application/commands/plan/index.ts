export * from './create-plan.command';
export * from './update-plan.command';
export * from './activate-plan.command';
export * from './deactivate-plan.command';

import { CreatePlanCommandHandler } from './create-plan.command';
import { UpdatePlanCommandHandler } from './update-plan.command';
import { ActivatePlanCommandHandler } from './activate-plan.command';
import { DeactivatePlanCommandHandler } from './deactivate-plan.command';

export const PlanCommandHandlers = [
  CreatePlanCommandHandler,
  UpdatePlanCommandHandler,
  ActivatePlanCommandHandler,
  DeactivatePlanCommandHandler,
];
