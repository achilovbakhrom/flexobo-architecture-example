import { IAggregateStore } from '@flexobo/core';
import { SavedSearch } from '../domain/aggregates/saved-search.aggregate';
import { SavedSearchType, SearchFilters } from '../domain/events/saved-search.events';

export const SAVED_SEARCH_AGGREGATE_STORE = Symbol('SAVED_SEARCH_AGGREGATE_STORE');
export const SAVED_SEARCH_READ_REPOSITORY = Symbol('SAVED_SEARCH_READ_REPOSITORY');

export type ISavedSearchAggregateStore = IAggregateStore<SavedSearch>;

export interface SavedSearchReadDto {
  id: string;
  userId: string;
  name: string;
  searchType: SavedSearchType;
  filters: SearchFilters;
  notifyOnNew: boolean;
  isActive: boolean;
  lastUsedAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedSearchFilters {
  searchType?: SavedSearchType;
  isActive?: boolean;
  notifyOnNew?: boolean;
  offset?: number;
  limit?: number;
}

export interface ISavedSearchReadRepository {
  findById(id: string): Promise<SavedSearchReadDto | null>;
  findByUser(userId: string, filters?: SavedSearchFilters): Promise<SavedSearchReadDto[]>;
  countByUser(userId: string, filters?: SavedSearchFilters): Promise<number>;
  save(search: SavedSearchReadDto): Promise<void>;
  delete(id: string): Promise<void>;
}
