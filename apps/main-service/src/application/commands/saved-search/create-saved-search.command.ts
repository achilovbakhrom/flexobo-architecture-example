import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { SavedSearch } from '../../../domain/aggregates/saved-search.aggregate';
import { SavedSearchType, SearchFilters } from '../../../domain/events/saved-search.events';
import {
  ISavedSearchAggregateStore,
  SAVED_SEARCH_AGGREGATE_STORE,
} from '../../../ports/saved-search.repository';

export class CreateSavedSearchCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly searchType: SavedSearchType,
    public readonly filters: SearchFilters,
    public readonly notifyOnNew: boolean = false
  ) {}
}

@Injectable()
@CommandHandler(CreateSavedSearchCommand)
export class CreateSavedSearchHandler implements ICommandHandler<CreateSavedSearchCommand> {
  constructor(
    @Inject(SAVED_SEARCH_AGGREGATE_STORE)
    private readonly searchStore: ISavedSearchAggregateStore
  ) {}

  async execute(command: CreateSavedSearchCommand): Promise<string> {
    const searchId = uuidv4();

    const search = SavedSearch.create(searchId, {
      userId: command.userId,
      name: command.name,
      searchType: command.searchType,
      filters: command.filters,
      notifyOnNew: command.notifyOnNew,
    });

    await this.searchStore.save(search);

    return searchId;
  }
}
