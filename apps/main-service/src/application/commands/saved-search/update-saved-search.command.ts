import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
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

@Injectable()
@CommandHandler(UpdateSavedSearchCommand)
export class UpdateSavedSearchHandler implements ICommandHandler<UpdateSavedSearchCommand> {
  constructor(
    @Inject(SAVED_SEARCH_AGGREGATE_STORE)
    private readonly searchStore: ISavedSearchAggregateStore
  ) {}

  async execute(command: UpdateSavedSearchCommand): Promise<void> {
    const search = await this.searchStore.load(command.searchId);

    if (!search) {
      throw new Error('Saved search not found');
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
  }
}
