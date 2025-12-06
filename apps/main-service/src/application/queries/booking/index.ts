export * from './get-booking.query';
export * from './list-bookings.query';
export * from './get-rating-status.query';

import { GetBookingHandler } from './get-booking.query';
import { ListBookingsHandler } from './list-bookings.query';
import { GetRatingStatusHandler } from './get-rating-status.query';

export const BookingQueryHandlers = [
  GetBookingHandler,
  ListBookingsHandler,
  GetRatingStatusHandler,
];
