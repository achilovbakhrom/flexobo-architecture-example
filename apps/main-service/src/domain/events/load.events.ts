export const LOAD_EVENT_TYPES = {
  CREATED: 'load.created',
  UPDATED: 'load.updated',
  STATUS_CHANGED: 'load.status_changed',
  DELETED: 'load.deleted',
} as const;

export interface CargoData {
  name: string;
  weight: number;
  volume?: number;
  quantity?: number;
  packagingType?: string;
}

export interface LocationData {
  country: string;
  city: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface LoadCreatedEventData extends Record<string, unknown> {
  ownerId: string;
  companyId: string;
  from: LocationData;
  to: LocationData;
  transportType: string;
  loadingTypes: string[];
  cargos: CargoData[];
  totalWeight: number;
  totalVolume?: number;
  features: string[];
  adrClasses: string[];
  temperatureMin?: number;
  temperatureMax?: number;
  price?: number;
  currency: string;
  paymentTerms?: string;
  loadingDate: string;
  loadingDateTo?: string;
  unloadingDate?: string;
  boardIds: string[];
  isPublic: boolean;
}

export interface LoadUpdatedEventData extends Record<string, unknown> {
  from?: LocationData;
  to?: LocationData;
  transportType?: string;
  loadingTypes?: string[];
  cargos?: CargoData[];
  totalWeight?: number;
  totalVolume?: number;
  features?: string[];
  adrClasses?: string[];
  temperatureMin?: number;
  temperatureMax?: number;
  price?: number;
  currency?: string;
  paymentTerms?: string;
  loadingDate?: string;
  loadingDateTo?: string;
  unloadingDate?: string;
  boardIds?: string[];
  isPublic?: boolean;
}

export interface LoadStatusChangedEventData extends Record<string, unknown> {
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
}

export interface LoadDeletedEventData extends Record<string, unknown> {
  deletedAt: string;
  deletedBy: string;
}
