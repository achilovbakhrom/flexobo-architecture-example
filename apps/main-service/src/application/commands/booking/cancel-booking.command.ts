import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { PostType } from '../../../domain/constants/enums';
import {
  IBookingAggregateStore,
  BOOKING_AGGREGATE_STORE,
  IBookingReadRepository,
  BOOKING_READ_REPOSITORY,
} from '../../../ports/booking.repository';
import {
  ILoadAggregateStore,
  LOAD_AGGREGATE_STORE,
} from '../../../ports/load.repository';
import {
  ITripAggregateStore,
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
  implements ICommandHandler<CancelBookingCommand>
{
  constructor(
    @Inject(BOOKING_AGGREGATE_STORE)
    private readonly bookingStore: IBookingAggregateStore,
    @Inject(BOOKING_READ_REPOSITORY)
    private readonly bookingRepo: IBookingReadRepository,
    @Inject(LOAD_AGGREGATE_STORE)
    private readonly loadStore: ILoadAggregateStore,
    @Inject(TRIP_AGGREGATE_STORE)
    private readonly tripStore: ITripAggregateStore
  ) {}

  async execute(command: CancelBookingCommand): Promise<void> {
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
  }
}
