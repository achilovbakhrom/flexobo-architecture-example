import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { PostType } from '../../../domain/constants/enums';
import { Booking } from '../../../domain/aggregates/booking.aggregate';
import { Load } from '../../../domain/aggregates/load.aggregate';
import { Trip } from '../../../domain/aggregates/trip.aggregate';
import {
  IBookingReadRepository,
  BOOKING_READ_REPOSITORY,
  BOOKING_AGGREGATE_STORE,
} from '../../../ports/booking.repository';
import {
  LOAD_AGGREGATE_STORE,
} from '../../../ports/load.repository';
import {
  TRIP_AGGREGATE_STORE,
} from '../../../ports/trip.repository';

export class CancelBookingCommand implements ICommand {
  constructor(
    public readonly bookingId: string,
    public readonly userId: string
  ) {}
}

@Injectable()
@CommandHandler(CancelBookingCommand)
export class CancelBookingHandler
  implements ICommandHandler<CancelBookingCommand, void>
{
  constructor(
    @Inject(BOOKING_AGGREGATE_STORE)
    private readonly bookingStore: IAggregateStore<Booking>,
    @Inject(BOOKING_READ_REPOSITORY)
    private readonly bookingRepo: IBookingReadRepository,
    @Inject(LOAD_AGGREGATE_STORE)
    private readonly loadStore: IAggregateStore<Load>,
    @Inject(TRIP_AGGREGATE_STORE)
    private readonly tripStore: IAggregateStore<Trip>
  ) {}

  async execute(command: CancelBookingCommand): Promise<Result<void, Error>> {
    try {
    const booking = await this.bookingStore.load(command.bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${command.bookingId} not found`);
    }

    // Either party can cancel
    const state = booking.getState();
    if (
      state.customerId !== command.userId &&
      state.ownerId !== command.userId
    ) {
      throw new ForbiddenException('Only booking participants can cancel');
    }

    booking.cancel(command.userId);
    await this.bookingStore.save(booking);

    // Re-activate the related post so it can be bid on again
    const bookingDetails = await this.bookingRepo.findById(command.bookingId);
    if (bookingDetails) {
      if (bookingDetails.postType === PostType.LOAD) {
        const load = await this.loadStore.load(bookingDetails.postId);
        if (load) {
          load.activate(command.userId); // Re-activate
          await this.loadStore.save(load);
        }
      } else {
        const trip = await this.tripStore.load(bookingDetails.postId);
        if (trip) {
          trip.activate(command.userId); // Re-activate
          await this.tripStore.save(trip);
        }
      }
    }

    return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
