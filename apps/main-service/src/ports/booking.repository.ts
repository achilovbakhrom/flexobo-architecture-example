import { IAggregateStore } from '@flexobo/core';
import { Booking } from '../domain/aggregates/booking.aggregate';

export const BOOKING_AGGREGATE_STORE = Symbol('BOOKING_AGGREGATE_STORE');
export const BOOKING_READ_REPOSITORY = Symbol('BOOKING_READ_REPOSITORY');

export type IBookingAggregateStore = IAggregateStore<Booking>;

export interface BookingReadDto {
  id: string;
  customerId: string;
  ownerId: string;
  postType: string;
  postId: string;
  bidId: string;
  finalPrice: number;
  currency: string;
  status: string;
  customerRating?: number;
  customerComment?: string;
  ownerRating?: number;
  ownerComment?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface BookingFilters {
  status?: string;
  offset?: number;
  limit?: number;
}

export interface IBookingReadRepository {
  findById(id: string): Promise<BookingReadDto | null>;
  findByCustomer(customerId: string, filters?: BookingFilters): Promise<BookingReadDto[]>;
  findByOwner(ownerId: string, filters?: BookingFilters): Promise<BookingReadDto[]>;
  countByCustomer(customerId: string, filters?: BookingFilters): Promise<number>;
  countByOwner(ownerId: string, filters?: BookingFilters): Promise<number>;
  save(booking: BookingReadDto): Promise<void>;
}
