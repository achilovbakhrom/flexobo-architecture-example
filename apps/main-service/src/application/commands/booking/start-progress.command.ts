import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  IBookingAggregateStore,
  BOOKING_AGGREGATE_STORE,
} from '../../../ports/booking.repository';

export class StartProgressCommand implements ICommand {
  constructor(
    public readonly bookingId: string,
    public readonly userId: string
  ) {}
}

@Injectable()
@CommandHandler(StartProgressCommand)
export class StartProgressHandler
  implements ICommandHandler<StartProgressCommand>
{
  constructor(
    @Inject(BOOKING_AGGREGATE_STORE)
    private readonly bookingStore: IBookingAggregateStore
  ) {}

  async execute(command: StartProgressCommand): Promise<void> {
    const booking = await this.bookingStore.load(command.bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${command.bookingId} not found`);
    }

    // Either party can start progress
    const state = booking.getState();
    if (
      state.customerId !== command.userId &&
      state.ownerId !== command.userId
    ) {
      throw new ForbiddenException('Only booking participants can start progress');
    }

    booking.startProgress(command.userId);

    await this.bookingStore.save(booking);
  }
}
