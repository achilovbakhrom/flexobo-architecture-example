import { ICommand, ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Load } from '../../../domain/aggregates/load.aggregate';
import { LOAD_AGGREGATE_STORE } from '../../../ports/load.repository';
import { IAggregateStore } from '@flexobo/core';
import { CargoData, LocationData } from '../../../domain/events/load.events';

export class UpdateLoadCommand implements ICommand {
  constructor(
    public readonly loadId: string,
    public readonly userId: string,
    public readonly from?: LocationData,
    public readonly to?: LocationData,
    public readonly transportType?: string,
    public readonly loadingTypes?: string[],
    public readonly cargos?: CargoData[],
    public readonly features?: string[],
    public readonly adrClasses?: string[],
    public readonly temperatureMin?: number,
    public readonly temperatureMax?: number,
    public readonly price?: number,
    public readonly currency?: string,
    public readonly paymentTerms?: string,
    public readonly loadingDate?: string,
    public readonly loadingDateTo?: string,
    public readonly unloadingDate?: string,
    public readonly boardIds?: string[],
    public readonly isPublic?: boolean
  ) {}
}

@CommandHandler(UpdateLoadCommand)
export class UpdateLoadHandler implements ICommandHandler<UpdateLoadCommand> {
  constructor(
    @Inject(LOAD_AGGREGATE_STORE)
    private readonly loadStore: IAggregateStore<Load>
  ) {}

  async execute(command: UpdateLoadCommand): Promise<void> {
    const load = await this.loadStore.load(command.loadId);

    if (!load) {
      throw new NotFoundException(`Load with id ${command.loadId} not found`);
    }

    const state = load.getState();
    if (state.ownerId !== command.userId) {
      throw new ForbiddenException('You can only update your own loads');
    }

    // Calculate totals if cargos are updated
    let totalWeight: number | undefined;
    let totalVolume: number | undefined;

    if (command.cargos) {
      totalWeight = command.cargos.reduce((sum, c) => sum + c.weight, 0);
      const volume = command.cargos.reduce((sum, c) => sum + (c.volume ?? 0), 0);
      totalVolume = volume > 0 ? volume : undefined;
    }

    load.update({
      from: command.from,
      to: command.to,
      transportType: command.transportType,
      loadingTypes: command.loadingTypes,
      cargos: command.cargos,
      totalWeight,
      totalVolume,
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
  }
}
