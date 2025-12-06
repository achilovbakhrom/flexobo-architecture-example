import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  IBookingReadRepository,
  BookingReadDto,
  BOOKING_READ_REPOSITORY,
} from '../../../ports/booking.repository';

export class GetBookingQuery implements IQuery {
  constructor(public readonly bookingId: string) {}
}

@Injectable()
@QueryHandler(GetBookingQuery)
export class GetBookingHandler implements IQueryHandler<GetBookingQuery> {
  constructor(
    @Inject(BOOKING_READ_REPOSITORY)
    private readonly bookingRepo: IBookingReadRepository
  ) {}

  async execute(query: GetBookingQuery): Promise<BookingReadDto> {
    const booking = await this.bookingRepo.findById(query.bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${query.bookingId} not found`);
    }
    return booking;
  }
}
