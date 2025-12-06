import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Trip } from '../../../domain/aggregates/trip.aggregate';
import { TRIP_AGGREGATE_STORE } from '../../../ports/trip.repository';

export class UpdateTripCommand implements ICommand {
  constructor(
    public readonly tripId: string,
    public readonly userId: string,
    public readonly transport?: {
      id: string;
      type: string;
      capacity: number;
      dimensions?: {
        lengthM?: number;
        widthM?: number;
        heightM?: number;
      };
      loadingTypes: string[];
      features?: string[];
      permits?: string[];
    },
    public readonly loadingPoints?: Array<{
      country: string;
      city: string;
      address?: string;
      lat?: number;
      lng?: number;
      date: string;
      radius?: number;
    }>,
    public readonly unloadingPoints?: Array<{
      country: string;
      city: string;
      address?: string;
      lat?: number;
      lng?: number;
      date: string;
      radius?: number;
    }>,
    public readonly price?: number,
    public readonly currency?: string,
    public readonly paymentTerms?: string,
    public readonly boardIds?: string[],
    public readonly isPublic?: boolean
  ) {}
}

@Injectable()
@CommandHandler(UpdateTripCommand)
export class UpdateTripHandler implements ICommandHandler<UpdateTripCommand, void> {
  constructor(
    @Inject(TRIP_AGGREGATE_STORE)
    private readonly tripStore: IAggregateStore<Trip>
  ) {}

  async execute(command: UpdateTripCommand): Promise<Result<void, Error>> {
    try {
      const trip = await this.tripStore.load(command.tripId);
      if (!trip) {
        throw new NotFoundException(`Trip ${command.tripId} not found`);
      }

      if (trip.getState().ownerId !== command.userId) {
        throw new ForbiddenException('Only the owner can update the trip');
      }

      trip.update({
        transport: command.transport
          ? {
              id: command.transport.id,
              type: command.transport.type,
              capacity: command.transport.capacity,
              dimensions: command.transport.dimensions,
              loadingTypes: command.transport.loadingTypes,
              features: command.transport.features ?? [],
              permits: command.transport.permits ?? [],
            }
          : undefined,
        loadingPoints: command.loadingPoints,
        unloadingPoints: command.unloadingPoints,
        price: command.price,
        currency: command.currency,
        paymentTerms: command.paymentTerms,
        boardIds: command.boardIds,
        isPublic: command.isPublic,
      });

      await this.tripStore.save(trip);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
