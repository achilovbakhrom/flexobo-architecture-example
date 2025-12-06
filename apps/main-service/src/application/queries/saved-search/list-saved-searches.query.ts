import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  ISavedSearchReadRepository,
  SAVED_SEARCH_READ_REPOSITORY,
  SavedSearchReadDto,
  SavedSearchFilters,
} from '../../../ports/saved-search.repository';
import { SavedSearchType } from '../../../domain/events/saved-search.events';
import { SavedSearchDto } from './get-saved-search.query';

export class ListSavedSearchesQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly searchType?: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

export interface ListSavedSearchesResult {
  data: SavedSearchDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(ListSavedSearchesQuery)
export class ListSavedSearchesHandler implements IQueryHandler<ListSavedSearchesQuery, ListSavedSearchesResult> {
  constructor(
    @Inject(SAVED_SEARCH_READ_REPOSITORY)
    private readonly searchRepository: ISavedSearchReadRepository
  ) {}

  async execute(query: ListSavedSearchesQuery): Promise<ListSavedSearchesResult> {
    const offset = (query.page - 1) * query.limit;
    const filters: SavedSearchFilters = {
      searchType: query.searchType as SavedSearchType | undefined,
      offset,
      limit: query.limit,
    };

    const [data, total] = await Promise.all([
      this.searchRepository.findByUser(query.userId, filters),
      this.searchRepository.countByUser(query.userId, { searchType: filters.searchType }),
    ]);

    return {
      data: data.map((search: SavedSearchReadDto) => ({
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
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
