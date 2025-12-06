import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  BOOKING_EVENT_TYPES,
  BookingCreatedEventData,
  BookingStatusChangedEventData,
  CustomerRatedEventData,
  OwnerRatedEventData,
} from '../events/booking.events';
import { BookingStatus, PostType } from '../constants/enums';

export interface BookingState {
  customerId: string;
  ownerId: string;
  postType: PostType;
  postId: string;
  bidId: string;
  finalPrice: number;
  currency: string;
  status: BookingStatus;
  customerRating?: number;
  customerComment?: string;
  ownerRating?: number;
  ownerComment?: string;
  completedAt?: string;
}

export class Booking extends AggregateRoot {
  private customerId!: string;
  private ownerId!: string;
  private postType!: PostType;
  private postId!: string;
  private bidId!: string;
  private finalPrice!: number;
  private currency = 'USD';
  private status: BookingStatus = BookingStatus.PENDING;
  private customerRating?: number;
  private customerComment?: string;
  private ownerRating?: number;
  private ownerComment?: string;
  private completedAt?: string;

  static createFromBid(
    bookingId: string,
    data: BookingCreatedEventData
  ): Booking {
    const booking = new Booking(bookingId);
    const event = booking.createEvent(BOOKING_EVENT_TYPES.CREATED, data);
    booking.addEvent(event);
    booking.apply(event);
    return booking;
  }

  static fromEvents(events: DomainEvent[]): Booking {
    if (events.length === 0) {
      throw new Error('Cannot create Booking from empty events');
    }
    const booking = new Booking(events[0].aggregateId);
    booking.loadFromHistory(events);
    return booking;
  }

  confirm(userId: string): void {
    if (this.status !== BookingStatus.PENDING) {
      throw new Error('Can only confirm pending bookings');
    }
    if (userId !== this.ownerId) {
      throw new Error('Only the owner can confirm the booking');
    }
    const event = this.createEvent<
      typeof BOOKING_EVENT_TYPES.STATUS_CHANGED,
      BookingStatusChangedEventData
    >(BOOKING_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: BookingStatus.CONFIRMED,
      changedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  startProgress(userId: string): void {
    if (this.status !== BookingStatus.CONFIRMED) {
      throw new Error('Can only start progress on confirmed bookings');
    }
    const event = this.createEvent<
      typeof BOOKING_EVENT_TYPES.STATUS_CHANGED,
      BookingStatusChangedEventData
    >(BOOKING_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: BookingStatus.IN_PROGRESS,
      changedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  complete(userId: string): void {
    if (this.status !== BookingStatus.IN_PROGRESS) {
      throw new Error('Can only complete in-progress bookings');
    }
    const event = this.createEvent<
      typeof BOOKING_EVENT_TYPES.STATUS_CHANGED,
      BookingStatusChangedEventData
    >(BOOKING_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: BookingStatus.COMPLETED,
      changedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  cancel(userId: string, reason?: string): void {
    if (
      this.status === BookingStatus.COMPLETED ||
      this.status === BookingStatus.CANCELLED
    ) {
      throw new Error('Cannot cancel completed or already cancelled bookings');
    }
    const event = this.createEvent<
      typeof BOOKING_EVENT_TYPES.STATUS_CHANGED,
      BookingStatusChangedEventData
    >(BOOKING_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: BookingStatus.CANCELLED,
      changedBy: userId,
      reason,
    });
    this.addEvent(event);
    this.apply(event);
  }

  rateByCustomer(rating: number, comment?: string): void {
    if (this.status !== BookingStatus.COMPLETED) {
      throw new Error('Can only rate completed bookings');
    }
    if (this.customerRating !== undefined) {
      throw new Error('Customer has already rated');
    }
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    const event = this.createEvent<
      typeof BOOKING_EVENT_TYPES.CUSTOMER_RATED,
      CustomerRatedEventData
    >(BOOKING_EVENT_TYPES.CUSTOMER_RATED, {
      rating,
      comment,
      ratedAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  rateByOwner(rating: number, comment?: string): void {
    if (this.status !== BookingStatus.COMPLETED) {
      throw new Error('Can only rate completed bookings');
    }
    if (this.ownerRating !== undefined) {
      throw new Error('Owner has already rated');
    }
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    const event = this.createEvent<
      typeof BOOKING_EVENT_TYPES.OWNER_RATED,
      OwnerRatedEventData
    >(BOOKING_EVENT_TYPES.OWNER_RATED, {
      rating,
      comment,
      ratedAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  getState(): BookingState {
    return {
      customerId: this.customerId,
      ownerId: this.ownerId,
      postType: this.postType,
      postId: this.postId,
      bidId: this.bidId,
      finalPrice: this.finalPrice,
      currency: this.currency,
      status: this.status,
      customerRating: this.customerRating,
      customerComment: this.customerComment,
      ownerRating: this.ownerRating,
      ownerComment: this.ownerComment,
      completedAt: this.completedAt,
    };
  }

  getDetails() {
    return { id: this.id, ...this.getState(), version: this.version };
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case BOOKING_EVENT_TYPES.CREATED:
        this.applyCreated(event.data as BookingCreatedEventData);
        break;
      case BOOKING_EVENT_TYPES.STATUS_CHANGED:
        this.applyStatusChanged(event.data as BookingStatusChangedEventData);
        break;
      case BOOKING_EVENT_TYPES.CUSTOMER_RATED:
        this.applyCustomerRated(event.data as CustomerRatedEventData);
        break;
      case BOOKING_EVENT_TYPES.OWNER_RATED:
        this.applyOwnerRated(event.data as OwnerRatedEventData);
        break;
    }
  }

  private applyCreated(data: BookingCreatedEventData): void {
    this.customerId = data.customerId;
    this.ownerId = data.ownerId;
    this.postType = data.postType as PostType;
    this.postId = data.postId;
    this.bidId = data.bidId;
    this.finalPrice = data.finalPrice;
    this.currency = data.currency;
    this.status = BookingStatus.PENDING;
  }

  private applyStatusChanged(data: BookingStatusChangedEventData): void {
    this.status = data.newStatus as BookingStatus;
    if (data.newStatus === BookingStatus.COMPLETED) {
      this.completedAt = new Date().toISOString();
    }
  }

  private applyCustomerRated(data: CustomerRatedEventData): void {
    this.customerRating = data.rating;
    this.customerComment = data.comment;
  }

  private applyOwnerRated(data: OwnerRatedEventData): void {
    this.ownerRating = data.rating;
    this.ownerComment = data.comment;
  }
}
