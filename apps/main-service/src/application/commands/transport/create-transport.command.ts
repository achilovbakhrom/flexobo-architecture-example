import { ICommand, ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Transport } from '../../../domain/aggregates/transport.aggregate';
import { TRANSPORT_AGGREGATE_STORE } from '../../../ports/transport.repository';
import { IAggregateStore } from '@flexobo/core';

export class CreateTransportCommand implements ICommand {
  constructor(
    public readonly ownerId: string,
    public readonly companyId: string,
    public readonly transportType: string,
    public readonly loadingTypes: string[],
    public readonly capacityTons: number,
    public readonly capacityM3?: number,
    public readonly lengthM?: number,
    public readonly widthM?: number,
    public readonly heightM?: number,
    public readonly features: string[] = [],
    public readonly adrClasses: string[] = [],
    public readonly permits: string[] = []
  ) {}
}

@CommandHandler(CreateTransportCommand)
export class CreateTransportHandler
  implements ICommandHandler<CreateTransportCommand>
{
  constructor(
    @Inject(TRANSPORT_AGGREGATE_STORE)
    private readonly transportStore: IAggregateStore<Transport>
  ) {}

  async execute(command: CreateTransportCommand): Promise<string> {
    const transportId = uuidv4();

    const transport = Transport.create(transportId, {
      ownerId: command.ownerId,
      companyId: command.companyId,
      transportType: command.transportType,
      loadingTypes: command.loadingTypes,
      capacityTons: command.capacityTons,
      capacityM3: command.capacityM3,
      lengthM: command.lengthM,
      widthM: command.widthM,
      heightM: command.heightM,
      features: command.features,
      adrClasses: command.adrClasses,
      permits: command.permits,
    });

    await this.transportStore.save(transport);

    return transportId;
  }
}
