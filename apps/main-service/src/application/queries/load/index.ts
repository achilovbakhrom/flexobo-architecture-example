export * from './get-load.query';
export * from './list-loads.query';
export * from './search-loads.query';

import { GetLoadHandler } from './get-load.query';
import { ListLoadsHandler } from './list-loads.query';
import { SearchLoadsHandler } from './search-loads.query';

export const LoadQueryHandlers = [
  GetLoadHandler,
  ListLoadsHandler,
  SearchLoadsHandler,
];
