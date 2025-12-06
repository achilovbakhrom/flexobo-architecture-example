export * from './get-trip.query';
export * from './list-trips.query';
export * from './search-trips.query';
export * from './get-trip-filter-data.query';
export * from './list-trips-with-bids.query';
export * from './list-trips-user-bid-on.query';

import { GetTripHandler } from './get-trip.query';
import { ListTripsHandler } from './list-trips.query';
import { SearchTripsHandler } from './search-trips.query';
import { GetTripFilterDataHandler } from './get-trip-filter-data.query';
import { ListTripsWithBidsHandler } from './list-trips-with-bids.query';
import { ListTripsUserBidOnHandler } from './list-trips-user-bid-on.query';

export const TripQueryHandlers = [
  GetTripHandler,
  ListTripsHandler,
  SearchTripsHandler,
  GetTripFilterDataHandler,
  ListTripsWithBidsHandler,
  ListTripsUserBidOnHandler,
];
