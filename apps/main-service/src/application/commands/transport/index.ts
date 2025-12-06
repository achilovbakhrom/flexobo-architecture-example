export * from './create-transport.command';
export * from './update-transport.command';
export * from './delete-transport.command';

import { CreateTransportHandler } from './create-transport.command';
import { UpdateTransportHandler } from './update-transport.command';
import { DeleteTransportHandler } from './delete-transport.command';

export const TransportCommandHandlers = [
  CreateTransportHandler,
  UpdateTransportHandler,
  DeleteTransportHandler,
];
