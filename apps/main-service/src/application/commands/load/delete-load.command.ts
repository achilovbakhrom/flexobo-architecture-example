import { ICommand, ICommandHandler, CommandHandler, IAggregateStore, Result, Success, Failure } from '@flexobo/core';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Load } from '../../../domain/aggregates/load.aggregate';
import { LOAD_AGGREGATE_STORE } from '../../../ports/load.repository';

export class DeleteLoadCommand implements ICommand {
  constructor(
    public readonly loadId: string,
    public readonly userId: string
  ) {}
}

@CommandHandler(DeleteLoadCommand)
export class DeleteLoadHandler implements ICommandHandler<DeleteLoadCommand, void> {
  constructor(
    @Inject(LOAD_AGGREGATE_STORE)
    private readonly loadStore: IAggregateStore<Load>
  ) {}

  async execute(command: DeleteLoadCommand): Promise<Result<void, Error>> {
    try {
      const load = await this.loadStore.load(command.loadId);

      if (!load) {
        throw new NotFoundException(`Load with id ${command.loadId} not found`);
      }

      const state = load.getState();
      if (state.ownerId !== command.userId) {
        throw new ForbiddenException('You can only delete your own loads');
      }

      load.delete(command.userId);

      await this.loadStore.save(load);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
