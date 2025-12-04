import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Trip } from '../../../domain/aggregates/trip.aggregate';
import { TRIP_AGGREGATE_STORE } from '../../../ports/trip.repository';

export class ActivateTripCommand implements ICommand {
  constructor(
    public readonly tripId: string,
    public readonly userId: string
  ) {}
}

@Injectable()
@CommandHandler(ActivateTripCommand)
export class ActivateTripHandler implements ICommandHandler<ActivateTripCommand, void> {
  constructor(
    @Inject(TRIP_AGGREGATE_STORE)
    private readonly tripStore: IAggregateStore<Trip>
  ) {}

  async execute(command: ActivateTripCommand): Promise<Result<void, Error>> {
    try {
      const trip = await this.tripStore.load(command.tripId);
      if (!trip) {
        throw new NotFoundException(`Trip ${command.tripId} not found`);
      }

      if (trip.getState().ownerId !== command.userId) {
        throw new ForbiddenException('Only the owner can activate the trip');
      }

      trip.activate(command.userId);

      await this.tripStore.save(trip);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
