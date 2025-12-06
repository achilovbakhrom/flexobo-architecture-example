import { Inject, NotFoundException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import {
  ISavedSearchAggregateStore,
  SAVED_SEARCH_AGGREGATE_STORE,
} from '../../../ports/saved-search.repository';

export class DeleteSavedSearchCommand implements ICommand {
  constructor(
    public readonly searchId: string,
    public readonly userId: string
  ) {}
}

@CommandHandler(DeleteSavedSearchCommand)
export class DeleteSavedSearchHandler implements ICommandHandler<DeleteSavedSearchCommand, void> {
  constructor(
    @Inject(SAVED_SEARCH_AGGREGATE_STORE)
    private readonly searchStore: ISavedSearchAggregateStore
  ) {}

  async execute(command: DeleteSavedSearchCommand): Promise<Result<void, Error>> {
    try {
      const search = await this.searchStore.load(command.searchId);

      if (!search) {
        return new Failure(new NotFoundException('Saved search not found'));
      }

      // Authorization check is done inside the aggregate
      search.delete(command.userId);

      await this.searchStore.save(search);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
