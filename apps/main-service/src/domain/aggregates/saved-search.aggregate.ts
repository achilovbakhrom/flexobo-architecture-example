import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  SAVED_SEARCH_EVENT_TYPES,
  SavedSearchType,
  SearchFilters,
  SavedSearchCreatedEventData,
  SavedSearchUpdatedEventData,
  SavedSearchDeletedEventData,
  SavedSearchUsedEventData,
} from '../events/saved-search.events';

export interface SavedSearchState {
  userId: string;
  name: string;
  searchType: SavedSearchType;
  filters: SearchFilters;
  notifyOnNew: boolean;
  isActive: boolean;
  isDeleted: boolean;
  lastUsedAt?: string;
}

export class SavedSearch extends AggregateRoot {
  private userId!: string;
  private name!: string;
  private searchType!: SavedSearchType;
  private filters!: SearchFilters;
  private notifyOnNew: boolean = false;
  private isActive: boolean = true;
  private isDeleted: boolean = false;
  private lastUsedAt?: string;

  static create(searchId: string, data: SavedSearchCreatedEventData): SavedSearch {
    const search = new SavedSearch(searchId);
    const event = search.createEvent(SAVED_SEARCH_EVENT_TYPES.CREATED, data);
    search.addEvent(event);
    search.apply(event);
    return search;
  }

  static fromEvents(events: DomainEvent[]): SavedSearch {
    if (events.length === 0) {
      throw new Error('Cannot create SavedSearch from empty events');
    }
    const search = new SavedSearch(events[0].aggregateId);
    search.loadFromHistory(events);
    return search;
  }

  update(data: SavedSearchUpdatedEventData, userId: string): void {
    if (this.isDeleted) throw new Error('Cannot update deleted saved search');
    if (this.userId !== userId) {
      throw new Error('Only the owner can update this saved search');
    }
    const event = this.createEvent(SAVED_SEARCH_EVENT_TYPES.UPDATED, data);
    this.addEvent(event);
    this.apply(event);
  }

  markUsed(): void {
    if (this.isDeleted) throw new Error('Cannot use deleted saved search');
    const event = this.createEvent<typeof SAVED_SEARCH_EVENT_TYPES.USED, SavedSearchUsedEventData>(
      SAVED_SEARCH_EVENT_TYPES.USED,
      {
        usedAt: new Date().toISOString(),
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  delete(userId: string): void {
    if (this.isDeleted) throw new Error('Saved search is already deleted');
    if (this.userId !== userId) {
      throw new Error('Only the owner can delete this saved search');
    }
    const event = this.createEvent<typeof SAVED_SEARCH_EVENT_TYPES.DELETED, SavedSearchDeletedEventData>(
      SAVED_SEARCH_EVENT_TYPES.DELETED,
      {
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  getState(): SavedSearchState {
    return {
      userId: this.userId,
      name: this.name,
      searchType: this.searchType,
      filters: { ...this.filters },
      notifyOnNew: this.notifyOnNew,
      isActive: this.isActive,
      isDeleted: this.isDeleted,
      lastUsedAt: this.lastUsedAt,
    };
  }

  getDetails() {
    return { id: this.id, ...this.getState(), version: this.version };
  }

  getUserId(): string {
    return this.userId;
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case SAVED_SEARCH_EVENT_TYPES.CREATED:
        this.applyCreated(event.data as SavedSearchCreatedEventData);
        break;
      case SAVED_SEARCH_EVENT_TYPES.UPDATED:
        this.applyUpdated(event.data as SavedSearchUpdatedEventData);
        break;
      case SAVED_SEARCH_EVENT_TYPES.USED:
        this.applyUsed(event.data as SavedSearchUsedEventData);
        break;
      case SAVED_SEARCH_EVENT_TYPES.DELETED:
        this.isDeleted = true;
        this.isActive = false;
        break;
    }
  }

  private applyCreated(data: SavedSearchCreatedEventData): void {
    this.userId = data.userId;
    this.name = data.name;
    this.searchType = data.searchType;
    this.filters = data.filters;
    this.notifyOnNew = data.notifyOnNew;
    this.isActive = true;
  }

  private applyUpdated(data: SavedSearchUpdatedEventData): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.filters !== undefined) this.filters = data.filters;
    if (data.notifyOnNew !== undefined) this.notifyOnNew = data.notifyOnNew;
    if (data.isActive !== undefined) this.isActive = data.isActive;
  }

  private applyUsed(data: SavedSearchUsedEventData): void {
    this.lastUsedAt = data.usedAt;
  }
}
