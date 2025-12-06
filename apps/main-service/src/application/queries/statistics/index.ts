export * from './get-dashboard-stats.query';
export * from './get-market-stats.query';
export * from './get-route-analytics.query';

import { GetDashboardStatsHandler } from './get-dashboard-stats.query';
import { GetMarketStatsHandler } from './get-market-stats.query';
import { GetRouteAnalyticsHandler } from './get-route-analytics.query';

export const StatisticsQueryHandlers = [
  GetDashboardStatsHandler,
  GetMarketStatsHandler,
  GetRouteAnalyticsHandler,
];
