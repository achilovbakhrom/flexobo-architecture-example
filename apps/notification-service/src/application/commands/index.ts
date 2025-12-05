export * from './notification.commands';
export * from './notification.handlers';
export * from './device-token.handlers';

import { NotificationCommandHandlers } from './notification.handlers';
import { DeviceTokenCommandHandlers } from './device-token.handlers';

export const CommandHandlers = [
  ...NotificationCommandHandlers,
  ...DeviceTokenCommandHandlers,
];
