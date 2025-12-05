export * from './notification.queries';
export * from './notification.handlers';

import { QueryHandlers as NotificationQueryHandlers } from './notification.handlers';

export const QueryHandlers = [...NotificationQueryHandlers];
