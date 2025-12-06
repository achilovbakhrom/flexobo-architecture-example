export * from './get-load.query';
export * from './list-loads.query';
export * from './search-loads.query';
export * from './get-load-filter-data.query';
export * from './list-loads-with-bids.query';
export * from './list-loads-user-bid-on.query';

import { GetLoadHandler } from './get-load.query';
import { ListLoadsHandler } from './list-loads.query';
import { SearchLoadsHandler } from './search-loads.query';
import { GetLoadFilterDataHandler } from './get-load-filter-data.query';
import { ListLoadsWithBidsHandler } from './list-loads-with-bids.query';
import { ListLoadsUserBidOnHandler } from './list-loads-user-bid-on.query';

export const LoadQueryHandlers = [
  GetLoadHandler,
  ListLoadsHandler,
  SearchLoadsHandler,
  GetLoadFilterDataHandler,
  ListLoadsWithBidsHandler,
  ListLoadsUserBidOnHandler,
];
