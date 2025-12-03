import { IAggregateStore } from '@flexobo/core';
import { Trip } from '../domain/aggregates/trip.aggregate';
import { RoutePointData, TransportSnapshotData } from '../domain/events/trip.events';

export const TRIP_AGGREGATE_STORE = Symbol('TRIP_AGGREGATE_STORE');
export const TRIP_READ_REPOSITORY = Symbol('TRIP_READ_REPOSITORY');

export type ITripAggregateStore = IAggregateStore<Trip>;

export interface TripReadDto {
  id: string;
  ownerId: string;
  companyId: string;
  status: string;
  transport: TransportSnapshotData;
  loadingPoints: RoutePointData[];
  unloadingPoints: RoutePointData[];
  price?: number;
  currency: string;
  paymentTerms?: string;
  boardIds: string[];
  isPublic: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripFilters {
  status?: string;
  offset?: number;
  limit?: number;
}

export interface SearchTripFilters extends TripFilters {
  fromCountry?: string;
  fromCity?: string;
  toCountry?: string;
  toCity?: string;
  transportType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  priceMin?: number;
  priceMax?: number;
  boardIds?: string[];
  isPublic?: boolean;
}

export interface ITripReadRepository {
  findById(id: string): Promise<TripReadDto | null>;
  findByOwner(ownerId: string, filters?: TripFilters): Promise<TripReadDto[]>;
  countByOwner(ownerId: string, filters?: TripFilters): Promise<number>;
  search(filters: SearchTripFilters): Promise<TripReadDto[]>;
  countSearch(filters: SearchTripFilters): Promise<number>;
  save(trip: TripReadDto): Promise<void>;
  delete(id: string): Promise<void>;
}
