import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  TripEvent,
  TripEventType,
  TripCreatedEvent,
  TripUpdatedEvent,
  TripStatusChangedEvent,
  TripPriceUpdatedEvent,
  TripTransportUpdatedEvent,
  TripDocumentAddedEvent,
  TripDocumentRemovedEvent,
} from './events/trip.events';
import {
  LoadStatus,
  PriceMode,
  PaymentMethod,
  CapacityUnit,
  TransportTypeFeature,
  TransportLoadingFeature,
  TripDocumentType,
} from './enums';

// ==============================================
// Value Objects & Types
// ==============================================

export interface TripDocument {
  id: string;
  type: TripDocumentType;
  url: string;
}

export interface TripTransportDetails {
  transportTypeId: string;
  transportTypeFeature: TransportTypeFeature;
  transportLoadingFeature: TransportLoadingFeature;
  loadingCapacity: number;
  capacity: number;
  capacityUnit: CapacityUnit;
  transportLength?: number;
  transportWidth?: number;
  transportHeight?: number;
}

// ==============================================
// Snapshot Interface
// ==============================================

export interface TripSnapshot {
  _id: string;
  ownerId: string;
  companyId?: string;
  transportDetails: TripTransportDetails;
  currencyId: string;
  distance?: number;
  tollDistance?: number;
  loadingPointId: string;
  unloadingPointId: string;
  fromLocationId: string;
  toLocationId: string;
  fromCountryCode: string;
  toCountryCode: string;
  loadingRadius: number;
  unloadingRadius: number;
  loadingReadyDate: Date;
  additionalLoadingReadyDate?: Date;
  price?: number;
  basePrice: number;
  paymentMethods: PaymentMethod[];
  note?: string;
  isNegotiable: boolean;
  isActive: boolean;
  privateDate?: Date;
  pricePerKm: number;
  isPricePerKmExceed?: boolean;
  priceMode?: PriceMode;
  status: LoadStatus;
  parentId?: string;
  images: string[];
  isSystemTrip: boolean;
  documents: TripDocument[];
}

// ==============================================
// Trip Aggregate Root
// ==============================================

export class Trip extends AggregateRoot {
  private ownerId!: string;
  private companyId?: string;
  private transportDetails!: TripTransportDetails;
  private currencyId!: string;
  private distance?: number;
  private tollDistance?: number;
  private loadingPointId!: string;
  private unloadingPointId!: string;
  private fromLocationId!: string;
  private toLocationId!: string;
  private fromCountryCode!: string;
  private toCountryCode!: string;
  private loadingRadius!: number;
  private unloadingRadius!: number;
  private loadingReadyDate!: Date;
  private additionalLoadingReadyDate?: Date;
  private price?: number;
  private basePrice = 0;
  private paymentMethods: PaymentMethod[] = [];
  private note?: string;
  private isNegotiable = false;
  private isActive = true;
  private privateDate?: Date;
  private pricePerKm = 0;
  private isPricePerKmExceed?: boolean;
  private priceMode?: PriceMode;
  private status = LoadStatus.OPEN;
  private parentId?: string;
  private images: string[] = [];
  private isSystemTrip = false;
  private documents: TripDocument[] = [];

  // ==============================================
  // Factory Methods
  // ==============================================

  static create(
    tripId: string,
    ownerId: string,
    data: {
      companyId?: string;
      transportDetails: TripTransportDetails;
      currencyId: string;
      loadingPointId: string;
      unloadingPointId: string;
      fromLocationId: string;
      toLocationId: string;
      fromCountryCode: string;
      toCountryCode: string;
      loadingRadius: number;
      unloadingRadius: number;
      loadingReadyDate: Date;
      additionalLoadingReadyDate?: Date;
      price?: number;
      basePrice?: number;
      pricePerKm?: number;
      priceMode?: PriceMode;
      paymentMethods?: PaymentMethod[];
      note?: string;
      isNegotiable?: boolean;
      distance?: number;
      tollDistance?: number;
      privateDate?: Date;
      parentId?: string;
      isSystemTrip?: boolean;
      images?: string[];
    }
  ): Trip {
    const trip = new Trip(tripId);
    const event = trip.createEvent(TripEventType.Created, {
      ownerId,
      ...data,
    });
    trip.addEvent(event);
    trip.apply(event);
    return trip;
  }

  static fromEvents(events: DomainEvent[]): Trip {
    if (events.length === 0) {
      throw new Error('Cannot create Trip from empty event list');
    }

    const trip = new Trip(events[0].aggregateId);
    trip.loadFromHistory(events);
    return trip;
  }

  static fromSnapshot(
    snapshotData: TripSnapshot,
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): Trip {
    const trip = new Trip(snapshotData._id);
    trip.applySnapshot(snapshotData);
    trip._version = snapshotVersion;

    if (subsequentEvents.length > 0) {
      trip.loadFromHistory(subsequentEvents);
    }

    return trip;
  }

  // ==============================================
  // Commands (Business Logic)
  // ==============================================

  updateDetails(data: {
    loadingPointId?: string;
    unloadingPointId?: string;
    fromLocationId?: string;
    toLocationId?: string;
    fromCountryCode?: string;
    toCountryCode?: string;
    loadingRadius?: number;
    unloadingRadius?: number;
    loadingReadyDate?: Date;
    additionalLoadingReadyDate?: Date;
    paymentMethods?: PaymentMethod[];
    note?: string;
    isNegotiable?: boolean;
    distance?: number;
    tollDistance?: number;
    images?: string[];
  }): void {
    const event = this.createEvent(TripEventType.Updated, {
      ...data,
      updatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  updatePrice(data: {
    price?: number;
    basePrice?: number;
    pricePerKm?: number;
    isPricePerKmExceed?: boolean;
    priceMode?: PriceMode;
  }): void {
    const event = this.createEvent(TripEventType.PriceUpdated, {
      ...data,
      updatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  changeStatus(status: LoadStatus): void {
    if (this.status === status) return;

    const event = this.createEvent(TripEventType.StatusChanged, {
      status,
      changedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  updateTransport(transportDetails: Partial<TripTransportDetails>): void {
    const event = this.createEvent(TripEventType.TransportUpdated, {
      transportDetails,
      updatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  addDocument(document: TripDocument): void {
    const event = this.createEvent(TripEventType.DocumentAdded, {
      document,
      addedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  removeDocument(documentId: string): void {
    const event = this.createEvent(TripEventType.DocumentRemoved, {
      documentId,
      removedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  activate(): void {
    if (this.isActive) return;

    const event = this.createEvent(TripEventType.Activated, {
      activatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  deactivate(): void {
    if (!this.isActive) return;

    const event = this.createEvent(TripEventType.Deactivated, {
      deactivatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  cancel(): void {
    const event = this.createEvent(TripEventType.Cancelled, {
      cancelledAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  complete(): void {
    const event = this.createEvent(TripEventType.Completed, {
      completedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  delete(): void {
    const event = this.createEvent(TripEventType.Deleted, {
      deletedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  // ==============================================
  // Event Handlers (apply)
  // ==============================================

  protected apply(event: DomainEvent<TripEvent>): void {
    switch (event.type) {
      case TripEventType.Created:
        this.applyTripCreated(event.data);
        break;
      case TripEventType.Updated:
        this.applyTripUpdated(event.data);
        break;
      case TripEventType.StatusChanged:
        this.applyStatusChanged(event.data);
        break;
      case TripEventType.PriceUpdated:
        this.applyPriceUpdated(event.data);
        break;
      case TripEventType.TransportUpdated:
        this.applyTransportUpdated(event.data);
        break;
      case TripEventType.DocumentAdded:
        this.applyDocumentAdded(event.data);
        break;
      case TripEventType.DocumentRemoved:
        this.applyDocumentRemoved(event.data);
        break;
      case TripEventType.Activated:
        this.applyActivated();
        break;
      case TripEventType.Deactivated:
        this.applyDeactivated();
        break;
      case TripEventType.Cancelled:
        this.applyCancelled();
        break;
      case TripEventType.Completed:
        this.applyCompleted();
        break;
      case TripEventType.Deleted:
        // Handled by projection
        break;
      default:
        // Ignore unknown events
        break;
    }
  }

  private applyTripCreated(data: TripCreatedEvent['data']): void {
    this.ownerId = data.ownerId;
    this.companyId = data.companyId;
    this.transportDetails = data.transportDetails;
    this.currencyId = data.currencyId;
    this.loadingPointId = data.loadingPointId;
    this.unloadingPointId = data.unloadingPointId;
    this.fromLocationId = data.fromLocationId;
    this.toLocationId = data.toLocationId;
    this.fromCountryCode = data.fromCountryCode;
    this.toCountryCode = data.toCountryCode;
    this.loadingRadius = data.loadingRadius;
    this.unloadingRadius = data.unloadingRadius;
    this.loadingReadyDate = new Date(data.loadingReadyDate);
    this.additionalLoadingReadyDate = data.additionalLoadingReadyDate
      ? new Date(data.additionalLoadingReadyDate)
      : undefined;
    this.price = data.price;
    this.basePrice = data.basePrice || 0;
    this.pricePerKm = data.pricePerKm || 0;
    this.priceMode = data.priceMode;
    this.paymentMethods = data.paymentMethods || [];
    this.note = data.note;
    this.isNegotiable = data.isNegotiable || false;
    this.distance = data.distance;
    this.tollDistance = data.tollDistance;
    this.privateDate = data.privateDate
      ? new Date(data.privateDate)
      : undefined;
    this.parentId = data.parentId;
    this.isSystemTrip = data.isSystemTrip || false;
    this.status = LoadStatus.OPEN;
    this.isActive = true;
    this.images = data.images || [];
  }

  private applyTripUpdated(data: TripUpdatedEvent['data']): void {
    if (data.loadingPointId) this.loadingPointId = data.loadingPointId;
    if (data.unloadingPointId) this.unloadingPointId = data.unloadingPointId;
    if (data.fromLocationId) this.fromLocationId = data.fromLocationId;
    if (data.toLocationId) this.toLocationId = data.toLocationId;
    if (data.fromCountryCode) this.fromCountryCode = data.fromCountryCode;
    if (data.toCountryCode) this.toCountryCode = data.toCountryCode;
    if (data.loadingRadius !== undefined)
      this.loadingRadius = data.loadingRadius;
    if (data.unloadingRadius !== undefined)
      this.unloadingRadius = data.unloadingRadius;
    if (data.loadingReadyDate)
      this.loadingReadyDate = new Date(data.loadingReadyDate);
    if (data.additionalLoadingReadyDate)
      this.additionalLoadingReadyDate = new Date(
        data.additionalLoadingReadyDate
      );
    if (data.paymentMethods) this.paymentMethods = data.paymentMethods;
    if (data.note !== undefined) this.note = data.note;
    if (data.isNegotiable !== undefined) this.isNegotiable = data.isNegotiable;
    if (data.distance !== undefined) this.distance = data.distance;
    if (data.tollDistance !== undefined) this.tollDistance = data.tollDistance;
    if (data.images !== undefined) this.images = data.images;
  }

  private applyStatusChanged(data: TripStatusChangedEvent['data']): void {
    this.status = data.status;
  }

  private applyPriceUpdated(data: TripPriceUpdatedEvent['data']): void {
    if (data.price !== undefined) this.price = data.price;
    if (data.basePrice !== undefined) this.basePrice = data.basePrice;
    if (data.pricePerKm !== undefined) this.pricePerKm = data.pricePerKm;
    if (data.isPricePerKmExceed !== undefined)
      this.isPricePerKmExceed = data.isPricePerKmExceed;
    if (data.priceMode !== undefined) this.priceMode = data.priceMode;
  }

  private applyTransportUpdated(data: TripTransportUpdatedEvent['data']): void {
    this.transportDetails = {
      ...this.transportDetails,
      ...data.transportDetails,
    };
  }

  private applyDocumentAdded(data: TripDocumentAddedEvent['data']): void {
    this.documents.push(data.document);
  }

  private applyDocumentRemoved(data: TripDocumentRemovedEvent['data']): void {
    this.documents = this.documents.filter((d) => d.id !== data.documentId);
  }

  private applyActivated(): void {
    this.isActive = true;
  }

  private applyDeactivated(): void {
    this.isActive = false;
  }

  private applyCancelled(): void {
    this.status = LoadStatus.CANCELLED;
  }

  private applyCompleted(): void {
    this.status = LoadStatus.COMPLETED;
  }

  // ==============================================
  // Snapshot Support
  // ==============================================

  toSnapshot(): TripSnapshot {
    return {
      _id: this.id,
      ownerId: this.ownerId,
      companyId: this.companyId,
      transportDetails: this.transportDetails,
      currencyId: this.currencyId,
      distance: this.distance,
      tollDistance: this.tollDistance,
      loadingPointId: this.loadingPointId,
      unloadingPointId: this.unloadingPointId,
      fromLocationId: this.fromLocationId,
      toLocationId: this.toLocationId,
      fromCountryCode: this.fromCountryCode,
      toCountryCode: this.toCountryCode,
      loadingRadius: this.loadingRadius,
      unloadingRadius: this.unloadingRadius,
      loadingReadyDate: this.loadingReadyDate,
      additionalLoadingReadyDate: this.additionalLoadingReadyDate,
      price: this.price,
      basePrice: this.basePrice,
      paymentMethods: this.paymentMethods,
      note: this.note,
      isNegotiable: this.isNegotiable,
      isActive: this.isActive,
      privateDate: this.privateDate,
      pricePerKm: this.pricePerKm,
      isPricePerKmExceed: this.isPricePerKmExceed,
      priceMode: this.priceMode,
      status: this.status,
      parentId: this.parentId,
      images: this.images,
      isSystemTrip: this.isSystemTrip,
      documents: this.documents,
    };
  }

  private applySnapshot(snapshot: TripSnapshot): void {
    this.ownerId = snapshot.ownerId;
    this.companyId = snapshot.companyId;
    this.transportDetails = snapshot.transportDetails;
    this.currencyId = snapshot.currencyId;
    this.distance = snapshot.distance;
    this.tollDistance = snapshot.tollDistance;
    this.loadingPointId = snapshot.loadingPointId;
    this.unloadingPointId = snapshot.unloadingPointId;
    this.fromLocationId = snapshot.fromLocationId;
    this.toLocationId = snapshot.toLocationId;
    this.fromCountryCode = snapshot.fromCountryCode;
    this.toCountryCode = snapshot.toCountryCode;
    this.loadingRadius = snapshot.loadingRadius;
    this.unloadingRadius = snapshot.unloadingRadius;
    this.loadingReadyDate = snapshot.loadingReadyDate;
    this.additionalLoadingReadyDate = snapshot.additionalLoadingReadyDate;
    this.price = snapshot.price;
    this.basePrice = snapshot.basePrice;
    this.paymentMethods = snapshot.paymentMethods;
    this.note = snapshot.note;
    this.isNegotiable = snapshot.isNegotiable;
    this.isActive = snapshot.isActive;
    this.privateDate = snapshot.privateDate;
    this.pricePerKm = snapshot.pricePerKm;
    this.isPricePerKmExceed = snapshot.isPricePerKmExceed;
    this.priceMode = snapshot.priceMode;
    this.status = snapshot.status;
    this.parentId = snapshot.parentId;
    this.images = snapshot.images;
    this.isSystemTrip = snapshot.isSystemTrip;
    this.documents = snapshot.documents;
  }

  // ==============================================
  // Getters
  // ==============================================

  get aggregateType(): string {
    return 'Trip';
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  getStatus(): LoadStatus {
    return this.status;
  }

  getIsActive(): boolean {
    return this.isActive;
  }
}
