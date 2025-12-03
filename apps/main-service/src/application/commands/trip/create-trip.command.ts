import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { Trip } from '../../../domain/aggregates/trip.aggregate';
import {
  ITripAggregateStore,
  TRIP_AGGREGATE_STORE,
} from '../../../ports/trip.repository';

export class CreateTripCommand implements ICommand {
  constructor(
    public readonly ownerId: string,
    public readonly companyId: string,
    public readonly transport: {
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
    public readonly loadingPoints: Array<{
      country: string;
      city: string;
      address?: string;
      lat?: number;
      lng?: number;
      date: string;
      radius?: number;
    }>,
    public readonly unloadingPoints: Array<{
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
@CommandHandler(CreateTripCommand)
export class CreateTripHandler implements ICommandHandler<CreateTripCommand> {
  constructor(
    @Inject(TRIP_AGGREGATE_STORE)
    private readonly tripStore: ITripAggregateStore
  ) {}

  async execute(command: CreateTripCommand): Promise<string> {
    const tripId = uuidv4();

    const trip = Trip.create(tripId, {
      ownerId: command.ownerId,
      companyId: command.companyId,
      transport: {
        id: command.transport.id,
        type: command.transport.type,
        capacity: command.transport.capacity,
        dimensions: command.transport.dimensions,
        loadingTypes: command.transport.loadingTypes,
        features: command.transport.features ?? [],
        permits: command.transport.permits ?? [],
      },
      loadingPoints: command.loadingPoints,
      unloadingPoints: command.unloadingPoints,
      price: command.price,
      currency: command.currency || 'USD',
      paymentTerms: command.paymentTerms,
      boardIds: command.boardIds || [],
      isPublic: command.isPublic ?? true,
    });

    await this.tripStore.save(trip);

    return tripId;
  }
}
