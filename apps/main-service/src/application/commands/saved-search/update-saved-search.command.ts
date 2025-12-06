import { Inject, NotFoundException } from '@nestjs/common';
import { ICommand, ICommandHandler, CommandHandler, Result, Success, Failure } from '@flexobo/core';
import { SearchFilters } from '../../../domain/events/saved-search.events';
import {
  ISavedSearchAggregateStore,
  SAVED_SEARCH_AGGREGATE_STORE,
} from '../../../ports/saved-search.repository';

export class UpdateSavedSearchCommand implements ICommand {
  constructor(
    public readonly searchId: string,
    public readonly userId: string,
    public readonly name?: string,
    public readonly filters?: SearchFilters,
    public readonly notifyOnNew?: boolean
  ) {}
}

@CommandHandler(UpdateSavedSearchCommand)
export class UpdateSavedSearchHandler implements ICommandHandler<UpdateSavedSearchCommand, void> {
  constructor(
    @Inject(SAVED_SEARCH_AGGREGATE_STORE)
    private readonly searchStore: ISavedSearchAggregateStore
  ) {}

  async execute(command: UpdateSavedSearchCommand): Promise<Result<void, Error>> {
    try {
      const search = await this.searchStore.load(command.searchId);

      if (!search) {
        return new Failure(new NotFoundException('Saved search not found'));
      }

      // Authorization check is done inside the aggregate
      search.update(
        {
          name: command.name,
          filters: command.filters,
          notifyOnNew: command.notifyOnNew,
        },
        command.userId
      );

      await this.searchStore.save(search);

      return new Success(undefined);
    } catch (error) {
      return new Failure(error as Error);
    }
  }
}
