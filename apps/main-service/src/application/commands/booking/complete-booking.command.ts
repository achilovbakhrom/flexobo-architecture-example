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

export class CompleteBookingCommand implements ICommand {
  constructor(
    public readonly bookingId: string,
    public readonly userId: string
  ) {}
}

@Injectable()
@CommandHandler(CompleteBookingCommand)
export class CompleteBookingHandler
  implements ICommandHandler<CompleteBookingCommand>
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

  async execute(command: CompleteBookingCommand): Promise<void> {
    const booking = await this.bookingStore.load(command.bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${command.bookingId} not found`);
    }

    // Either party can complete
    const state = booking.getState();
    if (
      state.customerId !== command.userId &&
      state.ownerId !== command.userId
    ) {
      throw new ForbiddenException('Only booking participants can complete');
    }

    booking.complete(command.userId);
    await this.bookingStore.save(booking);

    // Mark the related post as completed
    const bookingDetails = await this.bookingRepo.findById(command.bookingId);
    if (bookingDetails) {
      if (bookingDetails.postType === PostType.LOAD) {
        const load = await this.loadStore.load(bookingDetails.postId);
        if (load) {
          load.complete(command.userId);
          await this.loadStore.save(load);
        }
      } else {
        const trip = await this.tripStore.load(bookingDetails.postId);
        if (trip) {
          trip.complete(command.userId);
          await this.tripStore.save(trip);
        }
      }
    }
  }
}
