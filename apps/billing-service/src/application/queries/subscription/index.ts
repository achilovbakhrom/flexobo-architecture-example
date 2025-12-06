export * from './get-subscription.query';
export * from './get-subscription-by-company.query';
export * from './check-usage-limit.query';

// Re-export types for convenience
export { SubscriptionReadData as SubscriptionDto, ISubscriptionReadRepository } from '../../../ports/subscription.repository';

// Result type for list queries
export interface SubscriptionListResult {
  items: import('../../../ports/subscription.repository').SubscriptionReadData[];
  total: number;
  page: number;
  pageSize: number;
}

import { GetSubscriptionQueryHandler } from './get-subscription.query';
import { GetSubscriptionByCompanyQueryHandler } from './get-subscription-by-company.query';
import { CheckUsageLimitQueryHandler } from './check-usage-limit.query';

export const SubscriptionQueryHandlers = [
  GetSubscriptionQueryHandler,
  GetSubscriptionByCompanyQueryHandler,
  CheckUsageLimitQueryHandler,
];
