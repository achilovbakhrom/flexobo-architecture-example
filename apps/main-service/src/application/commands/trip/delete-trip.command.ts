import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  ITripAggregateStore,
  TRIP_AGGREGATE_STORE,
} from '../../../ports/trip.repository';

export class DeleteTripCommand implements ICommand {
  constructor(
    public readonly tripId: string,
    public readonly userId: string
  ) {}
}

@Injectable()
@CommandHandler(DeleteTripCommand)
export class DeleteTripHandler implements ICommandHandler<DeleteTripCommand> {
  constructor(
    @Inject(TRIP_AGGREGATE_STORE)
    private readonly tripStore: ITripAggregateStore
  ) {}

  async execute(command: DeleteTripCommand): Promise<void> {
    const trip = await this.tripStore.load(command.tripId);
    if (!trip) {
      throw new NotFoundException(`Trip ${command.tripId} not found`);
    }

    if (trip.getState().ownerId !== command.userId) {
      throw new ForbiddenException('Only the owner can delete the trip');
    }

    trip.delete(command.userId);

    await this.tripStore.save(trip);
  }
}
