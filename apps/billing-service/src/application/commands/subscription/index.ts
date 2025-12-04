export * from './create-subscription.command';
export * from './change-plan.command';
export * from './cancel-subscription.command';
export * from './record-usage.command';
export * from './activate-subscription.command';

import { CreateSubscriptionCommandHandler } from './create-subscription.command';
import { ChangePlanCommandHandler } from './change-plan.command';
import { CancelSubscriptionCommandHandler } from './cancel-subscription.command';
import { RecordUsageCommandHandler } from './record-usage.command';
import { ActivateSubscriptionCommandHandler } from './activate-subscription.command';

export const SubscriptionCommandHandlers = [
  CreateSubscriptionCommandHandler,
  ChangePlanCommandHandler,
  CancelSubscriptionCommandHandler,
  RecordUsageCommandHandler,
  ActivateSubscriptionCommandHandler,
];
