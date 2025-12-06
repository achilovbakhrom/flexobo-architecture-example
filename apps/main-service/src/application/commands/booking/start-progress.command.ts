import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Booking } from '../../../domain/aggregates/booking.aggregate';
import {
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
  implements ICommandHandler<StartProgressCommand, void>
{
  constructor(
    @Inject(BOOKING_AGGREGATE_STORE)
    private readonly bookingStore: IAggregateStore<Booking>
  ) {}

  async execute(command: StartProgressCommand): Promise<Result<void, Error>> {
    try {
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

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
