import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  IBookingAggregateStore,
  BOOKING_AGGREGATE_STORE,
} from '../../../ports/booking.repository';

export class ConfirmBookingCommand implements ICommand {
  constructor(
    public readonly bookingId: string,
    public readonly userId: string
  ) {}
}

@Injectable()
@CommandHandler(ConfirmBookingCommand)
export class ConfirmBookingHandler
  implements ICommandHandler<ConfirmBookingCommand>
{
  constructor(
    @Inject(BOOKING_AGGREGATE_STORE)
    private readonly bookingStore: IBookingAggregateStore
  ) {}

  async execute(command: ConfirmBookingCommand): Promise<void> {
    const booking = await this.bookingStore.load(command.bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${command.bookingId} not found`);
    }

    // Only owner can confirm
    const state = booking.getState();
    if (state.ownerId !== command.userId) {
      throw new ForbiddenException('Only the owner can confirm the booking');
    }

    booking.confirm(command.userId);

    await this.bookingStore.save(booking);
  }
}
