import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Load } from '../../../domain/aggregates/load.aggregate';
import { LOAD_AGGREGATE_STORE } from '../../../ports/load.repository';
import { CargoData, LocationData } from '../../../domain/events/load.events';

export class CreateLoadCommand implements ICommand {
  constructor(
    public readonly ownerId: string,
    public readonly companyId: string,
    public readonly from: LocationData,
    public readonly to: LocationData,
    public readonly transportType: string,
    public readonly loadingTypes: string[],
    public readonly cargos: CargoData[],
    public readonly loadingDate: string,
    public readonly loadingDateTo?: string,
    public readonly unloadingDate?: string,
    public readonly features: string[] = [],
    public readonly adrClasses: string[] = [],
    public readonly temperatureMin?: number,
    public readonly temperatureMax?: number,
    public readonly price?: number,
    public readonly currency = 'USD',
    public readonly paymentTerms?: string,
    public readonly boardIds: string[] = [],
    public readonly isPublic = true
  ) {}
}

@CommandHandler(CreateLoadCommand)
export class CreateLoadHandler implements ICommandHandler<CreateLoadCommand, string> {
  constructor(
    @Inject(LOAD_AGGREGATE_STORE)
    private readonly loadStore: IAggregateStore<Load>
  ) {}

  async execute(command: CreateLoadCommand): Promise<Result<string, Error>> {
    try {
      const loadId = uuidv4();

      // Calculate total weight and volume from cargos
      const totalWeight = command.cargos.reduce((sum, c) => sum + c.weight, 0);
      const totalVolume = command.cargos.reduce(
        (sum, c) => sum + (c.volume ?? 0),
        0
      );

      const load = Load.create(loadId, {
        ownerId: command.ownerId,
        companyId: command.companyId,
        from: command.from,
        to: command.to,
        transportType: command.transportType,
        loadingTypes: command.loadingTypes,
        cargos: command.cargos,
        totalWeight,
        totalVolume: totalVolume > 0 ? totalVolume : undefined,
        features: command.features,
        adrClasses: command.adrClasses,
        temperatureMin: command.temperatureMin,
        temperatureMax: command.temperatureMax,
        price: command.price,
        currency: command.currency,
        paymentTerms: command.paymentTerms,
        loadingDate: command.loadingDate,
        loadingDateTo: command.loadingDateTo,
        unloadingDate: command.unloadingDate,
        boardIds: command.boardIds,
        isPublic: command.isPublic,
      });

      await this.loadStore.save(load);

      return new Success(loadId);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
