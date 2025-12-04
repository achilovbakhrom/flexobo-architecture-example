import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Transport } from '../../../domain/aggregates/transport.aggregate';
import { TRANSPORT_AGGREGATE_STORE } from '../../../ports/transport.repository';

export class UpdateTransportCommand implements ICommand {
  constructor(
    public readonly transportId: string,
    public readonly userId: string,
    public readonly transportType?: string,
    public readonly loadingTypes?: string[],
    public readonly capacityTons?: number,
    public readonly capacityM3?: number,
    public readonly lengthM?: number,
    public readonly widthM?: number,
    public readonly heightM?: number,
    public readonly features?: string[],
    public readonly adrClasses?: string[],
    public readonly permits?: string[]
  ) {}
}

@CommandHandler(UpdateTransportCommand)
export class UpdateTransportHandler
  implements ICommandHandler<UpdateTransportCommand, void>
{
  constructor(
    @Inject(TRANSPORT_AGGREGATE_STORE)
    private readonly transportStore: IAggregateStore<Transport>
  ) {}

  async execute(command: UpdateTransportCommand): Promise<Result<void, Error>> {
    try {
      const transport = await this.transportStore.load(command.transportId);

      if (!transport) {
        throw new NotFoundException(
          `Transport with id ${command.transportId} not found`
        );
      }

      const state = transport.getState();
      if (state.ownerId !== command.userId) {
        throw new ForbiddenException('You can only update your own transports');
      }

      transport.update({
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

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
