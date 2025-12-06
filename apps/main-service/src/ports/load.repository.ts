import { IAggregateStore } from '@flexobo/core';
import { Load } from '../domain/aggregates/load.aggregate';
import { CargoData, LocationData } from '../domain/events/load.events';

export const LOAD_AGGREGATE_STORE = Symbol('LOAD_AGGREGATE_STORE');
export const LOAD_READ_REPOSITORY = Symbol('LOAD_READ_REPOSITORY');

export type ILoadAggregateStore = IAggregateStore<Load>;

export interface LoadReadDto {
  id: string;
  ownerId: string;
  companyId: string;
  status: string;
  fromCountry: string;
  fromCity: string;
  fromAddress?: string;
  fromLat?: number;
  fromLng?: number;
  toCountry: string;
  toCity: string;
  toAddress?: string;
  toLat?: number;
  toLng?: number;
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
  loadingDate: Date;
  loadingDateTo?: Date;
  unloadingDate?: Date;
  boardIds: string[];
  isPublic: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoadFilters {
  status?: string;
  transportType?: string;
  fromCountry?: string;
  toCountry?: string;
  loadingDateFrom?: Date;
  loadingDateTo?: Date;
  isPublic?: boolean;
  offset?: number;
  limit?: number;
}

export interface SearchLoadFilters extends LoadFilters {
  boardIds?: string[]; // User's accessible boards
}

export interface ILoadReadRepository {
  findById(id: string): Promise<LoadReadDto | null>;
  findByOwner(ownerId: string, filters?: LoadFilters): Promise<LoadReadDto[]>;
  countByOwner(ownerId: string, filters?: LoadFilters): Promise<number>;
  search(filters: SearchLoadFilters): Promise<LoadReadDto[]>;
  countSearch(filters: SearchLoadFilters): Promise<number>;
  save(load: LoadReadDto): Promise<void>;
  delete(id: string): Promise<void>;
}
