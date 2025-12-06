import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Booking } from '../../../domain/aggregates/booking.aggregate';
import {
  BOOKING_AGGREGATE_STORE,
} from '../../../ports/booking.repository';

export class RateBookingCommand implements ICommand {
  constructor(
    public readonly bookingId: string,
    public readonly userId: string,
    public readonly rating: number,
    public readonly comment?: string
  ) {}
}

@Injectable()
@CommandHandler(RateBookingCommand)
export class RateBookingHandler implements ICommandHandler<RateBookingCommand, void> {
  constructor(
    @Inject(BOOKING_AGGREGATE_STORE)
    private readonly bookingStore: IAggregateStore<Booking>
  ) {}

  async execute(command: RateBookingCommand): Promise<Result<void, Error>> {
    try {
      const booking = await this.bookingStore.load(command.bookingId);
      if (!booking) {
        throw new NotFoundException(`Booking ${command.bookingId} not found`);
      }

      if (command.rating < 1 || command.rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      const state = booking.getState();
      if (state.customerId === command.userId) {
        // Customer rates the owner
        booking.rateByCustomer(command.rating, command.comment);
      } else if (state.ownerId === command.userId) {
        // Owner rates the customer
        booking.rateByOwner(command.rating, command.comment);
      } else {
        throw new ForbiddenException('Only booking participants can rate');
      }

      await this.bookingStore.save(booking);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
