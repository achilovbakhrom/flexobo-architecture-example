import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Transport } from '../../../domain/aggregates/transport.aggregate';
import { TRANSPORT_AGGREGATE_STORE } from '../../../ports/transport.repository';

export class DeleteTransportCommand implements ICommand {
  constructor(
    public readonly transportId: string,
    public readonly userId: string
  ) {}
}

@CommandHandler(DeleteTransportCommand)
export class DeleteTransportHandler
  implements ICommandHandler<DeleteTransportCommand, void>
{
  constructor(
    @Inject(TRANSPORT_AGGREGATE_STORE)
    private readonly transportStore: IAggregateStore<Transport>
  ) {}

  async execute(command: DeleteTransportCommand): Promise<Result<void, Error>> {
    try {
      const transport = await this.transportStore.load(command.transportId);

      if (!transport) {
        throw new NotFoundException(
          `Transport with id ${command.transportId} not found`
        );
      }

      const state = transport.getState();
      if (state.ownerId !== command.userId) {
        throw new ForbiddenException('You can only delete your own transports');
      }

      transport.delete();

      await this.transportStore.save(transport);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
