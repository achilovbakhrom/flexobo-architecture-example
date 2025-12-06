export const BOOKING_EVENT_TYPES = {
  CREATED: 'booking.created',
  STATUS_CHANGED: 'booking.status_changed',
  CUSTOMER_RATED: 'booking.customer_rated',
  OWNER_RATED: 'booking.owner_rated',
} as const;

export interface BookingCreatedEventData extends Record<string, unknown> {
  customerId: string;
  ownerId: string;
  postType: 'LOAD' | 'TRIP';
  postId: string;
  bidId: string;
  finalPrice: number;
  currency: string;
}

export interface BookingStatusChangedEventData extends Record<string, unknown> {
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
}

export interface CustomerRatedEventData extends Record<string, unknown> {
  rating: number;
  comment?: string;
  ratedAt: string;
}

export interface OwnerRatedEventData extends Record<string, unknown> {
  rating: number;
  comment?: string;
  ratedAt: string;
}
