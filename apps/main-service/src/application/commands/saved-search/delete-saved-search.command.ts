import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
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

@Injectable()
@CommandHandler(DeleteSavedSearchCommand)
export class DeleteSavedSearchHandler implements ICommandHandler<DeleteSavedSearchCommand> {
  constructor(
    @Inject(SAVED_SEARCH_AGGREGATE_STORE)
    private readonly searchStore: ISavedSearchAggregateStore
  ) {}

  async execute(command: DeleteSavedSearchCommand): Promise<void> {
    const search = await this.searchStore.load(command.searchId);

    if (!search) {
      throw new Error('Saved search not found');
    }

    // Authorization check is done inside the aggregate
    search.delete(command.userId);

    await this.searchStore.save(search);
  }
}
