import { Injectable, Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  ISavedSearchReadRepository,
  SAVED_SEARCH_READ_REPOSITORY,
} from '../../../ports/saved-search.repository';

export class GetSavedSearchQuery implements IQuery {
  constructor(
    public readonly searchId: string,
    public readonly userId: string
  ) {}
}

export interface SavedSearchDto {
  id: string;
  userId: string;
  name: string;
  searchType: string;
  filters: Record<string, unknown>;
  notifyOnNew: boolean;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
@QueryHandler(GetSavedSearchQuery)
export class GetSavedSearchHandler implements IQueryHandler<GetSavedSearchQuery, SavedSearchDto | null> {
  constructor(
    @Inject(SAVED_SEARCH_READ_REPOSITORY)
    private readonly searchRepository: ISavedSearchReadRepository
  ) {}

  async execute(query: GetSavedSearchQuery): Promise<SavedSearchDto | null> {
    const search = await this.searchRepository.findById(query.searchId);

    if (!search) {
      return null;
    }

    // Only return if user owns this search
    if (search.userId !== query.userId) {
      return null;
    }

    return {
      id: search.id,
      userId: search.userId,
      name: search.name,
      searchType: search.searchType,
      filters: search.filters as Record<string, unknown>,
      notifyOnNew: search.notifyOnNew,
      isActive: search.isActive,
      lastUsedAt: search.lastUsedAt ?? null,
      createdAt: search.createdAt,
      updatedAt: search.updatedAt,
    };
  }
}
