export * from './get-transport.query';
export * from './list-transports.query';

import { GetTransportHandler } from './get-transport.query';
import { ListTransportsHandler } from './list-transports.query';

export const TransportQueryHandlers = [
  GetTransportHandler,
  ListTransportsHandler,
];
