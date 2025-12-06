export const SAVED_SEARCH_EVENT_TYPES = {
  CREATED: 'saved_search.created',
  UPDATED: 'saved_search.updated',
  DELETED: 'saved_search.deleted',
  USED: 'saved_search.used',
} as const;

export type SavedSearchType = 'LOAD' | 'TRIP';

export interface SearchFilters {
  // Location
  fromCountry?: string;
  fromCity?: string;
  toCountry?: string;
  toCity?: string;

  // Transport
  transportType?: string;
  loadingTypes?: string[];

  // Cargo
  minWeight?: number;
  maxWeight?: number;
  loadTypes?: string[];

  // Features
  features?: string[];
  adrClasses?: string[];

  // Price
  minPrice?: number;
  maxPrice?: number;
  currency?: string;

  // Dates
  loadingDateFrom?: string;
  loadingDateTo?: string;

  // Other
  radius?: number; // km radius for location search
}

export interface SavedSearchCreatedEventData extends Record<string, unknown> {
  userId: string;
  name: string;
  searchType: SavedSearchType;
  filters: SearchFilters;
  notifyOnNew: boolean;
}

export interface SavedSearchUpdatedEventData extends Record<string, unknown> {
  name?: string;
  filters?: SearchFilters;
  notifyOnNew?: boolean;
  isActive?: boolean;
}

export interface SavedSearchDeletedEventData extends Record<string, unknown> {
  deletedAt: string;
  deletedBy: string;
}

export interface SavedSearchUsedEventData extends Record<string, unknown> {
  usedAt: string;
}
