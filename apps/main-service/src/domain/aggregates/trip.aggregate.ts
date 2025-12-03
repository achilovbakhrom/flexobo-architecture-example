import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  TRIP_EVENT_TYPES,
  TripCreatedEventData,
  TripUpdatedEventData,
  TripStatusChangedEventData,
  TripDeletedEventData,
  RoutePointData,
  TransportSnapshotData,
} from '../events/trip.events';
import { TripStatus } from '../constants/enums';

export interface TripState {
  ownerId: string;
  companyId: string;
  status: TripStatus;
  transport: TransportSnapshotData;
  loadingPoints: RoutePointData[];
  unloadingPoints: RoutePointData[];
  price?: number;
  currency: string;
  paymentTerms?: string;
  boardIds: string[];
  isPublic: boolean;
  isDeleted: boolean;
}

export class Trip extends AggregateRoot {
  private ownerId!: string;
  private companyId!: string;
  private status: TripStatus = TripStatus.DRAFT;
  private transport!: TransportSnapshotData;
  private loadingPoints: RoutePointData[] = [];
  private unloadingPoints: RoutePointData[] = [];
  private price?: number;
  private currency: string = 'USD';
  private paymentTerms?: string;
  private boardIds: string[] = [];
  private isPublic: boolean = true;
  private isDeleted: boolean = false;

  static create(tripId: string, data: TripCreatedEventData): Trip {
    const trip = new Trip(tripId);
    const event = trip.createEvent(TRIP_EVENT_TYPES.CREATED, data);
    trip.addEvent(event);
    trip.apply(event);
    return trip;
  }

  static fromEvents(events: DomainEvent[]): Trip {
    if (events.length === 0) {
      throw new Error('Cannot create Trip from empty events');
    }
    const trip = new Trip(events[0].aggregateId);
    trip.loadFromHistory(events);
    return trip;
  }

  update(data: TripUpdatedEventData): void {
    if (this.isDeleted) throw new Error('Cannot update deleted trip');
    if (this.status !== TripStatus.DRAFT && this.status !== TripStatus.ACTIVE) {
      throw new Error('Can only update draft or active trips');
    }
    const event = this.createEvent(TRIP_EVENT_TYPES.UPDATED, data);
    this.addEvent(event);
    this.apply(event);
  }

  activate(userId: string): void {
    if (this.isDeleted) throw new Error('Cannot activate deleted trip');
    if (this.status !== TripStatus.DRAFT) {
      throw new Error('Can only activate draft trips');
    }
    const event = this.createEvent<
      typeof TRIP_EVENT_TYPES.STATUS_CHANGED,
      TripStatusChangedEventData
    >(TRIP_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: TripStatus.ACTIVE,
      changedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  markBooked(userId: string): void {
    if (this.isDeleted) throw new Error('Cannot book deleted trip');
    if (this.status !== TripStatus.ACTIVE) {
      throw new Error('Can only book active trips');
    }
    const event = this.createEvent<
      typeof TRIP_EVENT_TYPES.STATUS_CHANGED,
      TripStatusChangedEventData
    >(TRIP_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: TripStatus.BOOKED,
      changedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  complete(userId: string): void {
    if (this.status !== TripStatus.BOOKED) {
      throw new Error('Can only complete booked trips');
    }
    const event = this.createEvent<
      typeof TRIP_EVENT_TYPES.STATUS_CHANGED,
      TripStatusChangedEventData
    >(TRIP_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: TripStatus.COMPLETED,
      changedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  cancel(userId: string, reason?: string): void {
    if (this.status === TripStatus.COMPLETED || this.status === TripStatus.CANCELLED) {
      throw new Error('Cannot cancel completed or cancelled trips');
    }
    const event = this.createEvent<
      typeof TRIP_EVENT_TYPES.STATUS_CHANGED,
      TripStatusChangedEventData
    >(TRIP_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: TripStatus.CANCELLED,
      changedBy: userId,
      reason,
    });
    this.addEvent(event);
    this.apply(event);
  }

  delete(userId: string): void {
    if (this.isDeleted) throw new Error('Trip is already deleted');
    if (this.status === TripStatus.BOOKED) {
      throw new Error('Cannot delete booked trip');
    }
    const event = this.createEvent<
      typeof TRIP_EVENT_TYPES.DELETED,
      TripDeletedEventData
    >(TRIP_EVENT_TYPES.DELETED, {
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  getState(): TripState {
    return {
      ownerId: this.ownerId,
      companyId: this.companyId,
      status: this.status,
      transport: { ...this.transport },
      loadingPoints: this.loadingPoints.map((p) => ({ ...p })),
      unloadingPoints: this.unloadingPoints.map((p) => ({ ...p })),
      price: this.price,
      currency: this.currency,
      paymentTerms: this.paymentTerms,
      boardIds: [...this.boardIds],
      isPublic: this.isPublic,
      isDeleted: this.isDeleted,
    };
  }

  getDetails() {
    return { id: this.id, ...this.getState(), version: this.version };
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case TRIP_EVENT_TYPES.CREATED:
        this.applyCreated(event.data as TripCreatedEventData);
        break;
      case TRIP_EVENT_TYPES.UPDATED:
        this.applyUpdated(event.data as TripUpdatedEventData);
        break;
      case TRIP_EVENT_TYPES.STATUS_CHANGED:
        this.status = (event.data as TripStatusChangedEventData).newStatus as TripStatus;
        break;
      case TRIP_EVENT_TYPES.DELETED:
        this.isDeleted = true;
        this.status = TripStatus.CANCELLED;
        break;
    }
  }

  private applyCreated(data: TripCreatedEventData): void {
    this.ownerId = data.ownerId;
    this.companyId = data.companyId;
    this.transport = data.transport;
    this.loadingPoints = data.loadingPoints;
    this.unloadingPoints = data.unloadingPoints;
    this.price = data.price;
    this.currency = data.currency;
    this.paymentTerms = data.paymentTerms;
    this.boardIds = data.boardIds;
    this.isPublic = data.isPublic;
    this.status = TripStatus.DRAFT;
  }

  private applyUpdated(data: TripUpdatedEventData): void {
    if (data.transport) this.transport = data.transport;
    if (data.loadingPoints) this.loadingPoints = data.loadingPoints;
    if (data.unloadingPoints) this.unloadingPoints = data.unloadingPoints;
    if (data.price !== undefined) this.price = data.price;
    if (data.currency) this.currency = data.currency;
    if (data.paymentTerms !== undefined) this.paymentTerms = data.paymentTerms;
    if (data.boardIds) this.boardIds = data.boardIds;
    if (data.isPublic !== undefined) this.isPublic = data.isPublic;
  }
}
