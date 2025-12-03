import { AggregateRoot, DomainEvent } from '@flexobo/core';

import {
  LoadStatus,
  TruckLoadType,
  PriceMode,
  PaymentMethod,
  WeightUnit,
  LoadDocumentType,
} from './enums';
import { LoadEvent, LoadEventType } from './events/load.events';

// ==============================================
// Value Objects & Types
// ==============================================

export interface CargoItem {
  id: string;
  cargoTypeId: string;
  cargoTypeWeight: number;
  cargoWeightUnit: WeightUnit;
  cargoWeightTons?: number;
}

export interface LoadFeatures {
  adrClasses: string[];
  documents: string[];
  straps: number;
  coupling: string[];
  carsCount: number;
  carryingCapacity?: string;
  specialNotes?: string;
}

export interface LoadDocument {
  id: string;
  type: LoadDocumentType;
  url: string;
}

// ==============================================
// Snapshot Interface
// ==============================================

export interface LoadSnapshot {
  _id: string;
  ownerId: string;
  companyId?: string;
  transportTypeId: string;
  fromLocationId: string;
  toLocationId: string;
  fromCountryCode: string;
  toCountryCode: string;
  distance?: number;
  tollDistance?: number;
  price?: number;
  basePrice: number;
  currencyId: string;
  loadingTypeId: string;
  unloadingTypeId: string;
  targetDate: Date;
  additionalExtraDay?: Date;
  status: LoadStatus;
  isActive: boolean;
  privateDate?: Date;
  truckLoadType: TruckLoadType;
  negotiable: boolean;
  paymentMethods: PaymentMethod[];
  paymentCondition: boolean;
  paymentDays: number;
  prePayment: number;
  pricePerKm: number;
  isPricePerKmExceed?: boolean;
  priceMode?: PriceMode;
  parentId?: string;
  images: string[];
  certificates: string[];
  otherDocs: string[];
  isSystemLoad: boolean;
  cargos: CargoItem[];
  features?: LoadFeatures;
  documents: LoadDocument[];
}

// ==============================================
// Load Aggregate Root
// ==============================================

export class Load extends AggregateRoot {
  private ownerId!: string;
  private companyId?: string;
  private transportTypeId!: string;
  private fromLocationId!: string;
  private toLocationId!: string;
  private fromCountryCode!: string;
  private toCountryCode!: string;
  private distance?: number;
  private tollDistance?: number;
  private price?: number;
  private basePrice = 0;
  private currencyId!: string;
  private loadingTypeId!: string;
  private unloadingTypeId!: string;
  private targetDate!: Date;
  private additionalExtraDay?: Date;
  private status = LoadStatus.OPEN;
  private isActive = true;
  private privateDate?: Date;
  private truckLoadType = TruckLoadType.FTL;
  private negotiable = false;
  private paymentMethods: PaymentMethod[] = [];
  private paymentCondition = false;
  private paymentDays = 0;
  private prePayment = 0;
  private pricePerKm = 0;
  private isPricePerKmExceed?: boolean;
  private priceMode?: PriceMode;
  private parentId?: string;
  private images: string[] = [];
  private certificates: string[] = [];
  private otherDocs: string[] = [];
  private isSystemLoad = false;
  private cargos: CargoItem[] = [];
  private features?: LoadFeatures;
  private documents: LoadDocument[] = [];

  // ==============================================
  // Factory Methods
  // ==============================================

  static create(
    loadId: string,
    ownerId: string,
    data: {
      companyId?: string;
      transportTypeId: string;
      fromLocationId: string;
      toLocationId: string;
      fromCountryCode: string;
      toCountryCode: string;
      currencyId: string;
      loadingTypeId: string;
      unloadingTypeId: string;
      targetDate: Date;
      truckLoadType?: TruckLoadType;
      negotiable?: boolean;
      paymentMethods?: PaymentMethod[];
      paymentCondition?: boolean;
      paymentDays?: number;
      prePayment?: number;
      price?: number;
      basePrice?: number;
      pricePerKm?: number;
      priceMode?: PriceMode;
      distance?: number;
      tollDistance?: number;
      additionalExtraDay?: Date;
      privateDate?: Date;
      parentId?: string;
      isSystemLoad?: boolean;
    }
  ): Load {
    const load = new Load(loadId);
    const event = load.createEvent(LoadEventType.Created, {
      ownerId,
      companyId: data.companyId,
      transportTypeId: data.transportTypeId,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      fromCountryCode: data.fromCountryCode,
      toCountryCode: data.toCountryCode,
      currencyId: data.currencyId,
      loadingPointId: data.loadingTypeId,
      unloadingPointId: data.unloadingTypeId,
      loadingReadyDate: data.targetDate,
      additionalLoadingReadyDate: data.additionalExtraDay,
      truckLoadType: data.truckLoadType,
      paymentMethods: data.paymentMethods,
      paymentCondition: data.paymentCondition,
      paymentDays: data.paymentDays,
      prePayment: data.prePayment,
      price: data.price,
      basePrice: data.basePrice,
      pricePerKm: data.pricePerKm,
      isPricePerKmExceed: undefined,
      priceMode: data.priceMode,
      isNegotiable: data.negotiable,
      distance: data.distance,
      tollDistance: data.tollDistance,
      privateDate: data.privateDate,
      parentId: data.parentId,
      isSystemLoad: data.isSystemLoad,
    });
    load.addEvent(event);
    load.apply(event);
    return load;
  }

  static fromEvents(events: DomainEvent[]): Load {
    if (events.length === 0) {
      throw new Error('Cannot create Load from empty event list');
    }

    const load = new Load(events[0].aggregateId);
    load.loadFromHistory(events);
    return load;
  }

  static fromSnapshot(
    snapshotData: LoadSnapshot,
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): Load {
    const load = new Load(snapshotData._id);
    load.applySnapshot(snapshotData);
    load._version = snapshotVersion;

    if (subsequentEvents.length > 0) {
      load.loadFromHistory(subsequentEvents);
    }

    return load;
  }

  // ==============================================
  // Commands (Business Logic)
  // ==============================================

  updateDetails(data: {
    transportTypeId?: string;
    fromLocationId?: string;
    toLocationId?: string;
    fromCountryCode?: string;
    toCountryCode?: string;
    loadingTypeId?: string;
    unloadingTypeId?: string;
    targetDate?: Date;
    additionalExtraDay?: Date;
    truckLoadType?: TruckLoadType;
    negotiable?: boolean;
    paymentMethods?: PaymentMethod[];
    paymentCondition?: boolean;
    paymentDays?: number;
    prePayment?: number;
    distance?: number;
    tollDistance?: number;
    images?: string[];
  }): void {
    const event = this.createEvent(LoadEventType.Updated, {
      transportTypeId: data.transportTypeId,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      fromCountryCode: data.fromCountryCode,
      toCountryCode: data.toCountryCode,
      loadingPointId: data.loadingTypeId,
      unloadingPointId: data.unloadingTypeId,
      loadingReadyDate: data.targetDate,
      additionalLoadingReadyDate: data.additionalExtraDay,
      truckLoadType: data.truckLoadType,
      isNegotiable: data.negotiable,
      paymentMethods: data.paymentMethods,
      paymentCondition: data.paymentCondition,
      paymentDays: data.paymentDays,
      prePayment: data.prePayment,
      distance: data.distance,
      tollDistance: data.tollDistance,
      images: data.images,
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
    const event = this.createEvent(LoadEventType.PriceUpdated, { ...data, updatedAt: new Date() });
    this.addEvent(event);
    this.apply(event);
  }

  changeStatus(status: LoadStatus): void {
    if (this.status === status) return;

    const event = this.createEvent(LoadEventType.StatusChanged, { status, changedAt: new Date() });
    this.addEvent(event);
    this.apply(event);
  }

  addCargo(cargo: CargoItem): void {
    const event = this.createEvent(LoadEventType.CargoAdded, { cargo, addedAt: new Date() });
    this.addEvent(event);
    this.apply(event);
  }

  updateCargo(cargoId: string, updates: Partial<CargoItem>): void {
    const event = this.createEvent(LoadEventType.CargoUpdated, {
      cargoId,
      updates,
      updatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  removeCargo(cargoId: string): void {
    const event = this.createEvent(LoadEventType.CargoRemoved, { cargoId, removedAt: new Date() });
    this.addEvent(event);
    this.apply(event);
  }

  updateFeatures(features: LoadFeatures): void {
    const event = this.createEvent(LoadEventType.FeaturesUpdated, {
      features,
      updatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  addDocument(document: LoadDocument): void {
    const event = this.createEvent(LoadEventType.DocumentAdded, {
      document,
      addedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  removeDocument(documentId: string): void {
    const event = this.createEvent(LoadEventType.DocumentRemoved, {
      documentId,
      removedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  activate(): void {
    if (this.isActive) return;

    const event = this.createEvent(LoadEventType.Activated, { activatedAt: new Date() });
    this.addEvent(event);
    this.apply(event);
  }

  deactivate(): void {
    if (!this.isActive) return;

    const event = this.createEvent(LoadEventType.Deactivated, { deactivatedAt: new Date() });
    this.addEvent(event);
    this.apply(event);
  }

  cancel(): void {
    const event = this.createEvent(LoadEventType.StatusChanged, { status: LoadStatus.CANCELLED, changedAt: new Date() });
    this.addEvent(event);
    this.apply(event);
  }

  complete(): void {
    const event = this.createEvent(LoadEventType.StatusChanged, { status: LoadStatus.COMPLETED, changedAt: new Date() });
    this.addEvent(event);
    this.apply(event);
  }

  delete(): void {
    const event = this.createEvent(LoadEventType.Deleted, { deletedAt: new Date() });
    this.addEvent(event);
    this.apply(event);
  }

  // ==============================================
  // Event Handlers (apply)
  // ==============================================

  protected apply(event: DomainEvent<LoadEvent>): void {
    switch (event.type) {
      case LoadEventType.Created:
        this.ownerId = event.data.ownerId;
        this.companyId = event.data.companyId;
        this.transportTypeId = event.data.transportTypeId;
        this.fromLocationId = event.data.fromLocationId;
        this.toLocationId = event.data.toLocationId;
        this.fromCountryCode = event.data.fromCountryCode;
        this.toCountryCode = event.data.toCountryCode;
        this.currencyId = event.data.currencyId;
        this.loadingTypeId = event.data.loadingPointId;
        this.unloadingTypeId = event.data.unloadingPointId;
        this.targetDate = new Date(event.data.loadingReadyDate);
        this.truckLoadType = event.data.truckLoadType || TruckLoadType.FTL;
        this.negotiable = event.data.isNegotiable || false;
        this.paymentMethods = event.data.paymentMethods || [];
        this.paymentCondition = event.data.paymentCondition || false;
        this.paymentDays = event.data.paymentDays || 0;
        this.prePayment = event.data.prePayment || 0;
        this.price = event.data.price;
        this.basePrice = event.data.basePrice || 0;
        this.pricePerKm = event.data.pricePerKm || 0;
        this.isPricePerKmExceed = event.data.isPricePerKmExceed;
        this.priceMode = event.data.priceMode;
        this.distance = event.data.distance;
        this.tollDistance = event.data.tollDistance;
        this.additionalExtraDay = event.data.additionalLoadingReadyDate
          ? new Date(event.data.additionalLoadingReadyDate)
          : undefined;
        this.privateDate = event.data.privateDate
          ? new Date(event.data.privateDate)
          : undefined;
        this.parentId = event.data.parentId;
        this.isSystemLoad = event.data.isSystemLoad || false;
        this.status = LoadStatus.OPEN;
        this.isActive = true;
        if (event.data.images) {
          this.images = event.data.images;
        }
        if (event.data.cargos) {
          this.cargos = event.data.cargos;
        }
        if (event.data.features) {
          this.features = event.data.features;
        }
        break;

      case LoadEventType.Updated:
        if (event.data.transportTypeId !== undefined)
          this.transportTypeId = event.data.transportTypeId;
        if (event.data.fromLocationId !== undefined)
          this.fromLocationId = event.data.fromLocationId;
        if (event.data.toLocationId !== undefined)
          this.toLocationId = event.data.toLocationId;
        if (event.data.fromCountryCode !== undefined)
          this.fromCountryCode = event.data.fromCountryCode;
        if (event.data.toCountryCode !== undefined)
          this.toCountryCode = event.data.toCountryCode;
        if (event.data.loadingPointId !== undefined)
          this.loadingTypeId = event.data.loadingPointId;
        if (event.data.unloadingPointId !== undefined)
          this.unloadingTypeId = event.data.unloadingPointId;
        if (event.data.loadingReadyDate !== undefined)
          this.targetDate = new Date(event.data.loadingReadyDate);
        if (event.data.additionalLoadingReadyDate !== undefined)
          this.additionalExtraDay = new Date(event.data.additionalLoadingReadyDate);
        if (event.data.truckLoadType !== undefined)
          this.truckLoadType = event.data.truckLoadType;
        if (event.data.isNegotiable !== undefined)
          this.negotiable = event.data.isNegotiable;
        if (event.data.paymentMethods !== undefined)
          this.paymentMethods = event.data.paymentMethods;
        if (event.data.paymentCondition !== undefined)
          this.paymentCondition = event.data.paymentCondition;
        if (event.data.paymentDays !== undefined)
          this.paymentDays = event.data.paymentDays;
        if (event.data.prePayment !== undefined)
          this.prePayment = event.data.prePayment;
        if (event.data.distance !== undefined)
          this.distance = event.data.distance;
        if (event.data.tollDistance !== undefined)
          this.tollDistance = event.data.tollDistance;
        if (event.data.images !== undefined)
          this.images = event.data.images;
        break;

      case LoadEventType.StatusChanged:
        this.status = event.data.status;
        break;

      case LoadEventType.PriceUpdated:
        if (event.data.price !== undefined) this.price = event.data.price;
        if (event.data.basePrice !== undefined)
          this.basePrice = event.data.basePrice;
        if (event.data.pricePerKm !== undefined)
          this.pricePerKm = event.data.pricePerKm;
        if (event.data.isPricePerKmExceed !== undefined)
          this.isPricePerKmExceed = event.data.isPricePerKmExceed;
        if (event.data.priceMode !== undefined)
          this.priceMode = event.data.priceMode;
        if (event.data.paymentMethods !== undefined)
          this.paymentMethods = event.data.paymentMethods;
        break;

      case LoadEventType.CargoAdded:
        this.cargos.push(event.data.cargo);
        break;

      case LoadEventType.CargoUpdated: {
        const cargoIndex = this.cargos.findIndex(
          (c) => c.id === event.data.cargoId
        );
        if (cargoIndex !== -1) {
          this.cargos[cargoIndex] = {
            ...this.cargos[cargoIndex],
            ...event.data.updates,
          };
        }
        break;
      }

      case LoadEventType.CargoRemoved:
        this.cargos = this.cargos.filter((c) => c.id !== event.data.cargoId);
        break;

      case LoadEventType.FeaturesUpdated:
        this.features = event.data.features;
        break;

      case LoadEventType.DocumentAdded:
        this.documents.push(event.data.document);
        break;

      case LoadEventType.DocumentRemoved:
        this.documents = this.documents.filter(
          (d) => d.id !== event.data.documentId
        );
        break;

      case LoadEventType.Activated:
        this.isActive = true;
        break;

      case LoadEventType.Deactivated:
        this.isActive = false;
        break;

      case LoadEventType.Deleted:
        // Handled by projection
        break;

      default:
        // Ignore unknown events
        break;
    }
  }

  // ==============================================
  // Snapshot Support
  // ==============================================

  toSnapshot(): LoadSnapshot {
    return {
      _id: this.id,
      ownerId: this.ownerId,
      companyId: this.companyId,
      transportTypeId: this.transportTypeId,
      fromLocationId: this.fromLocationId,
      toLocationId: this.toLocationId,
      fromCountryCode: this.fromCountryCode,
      toCountryCode: this.toCountryCode,
      distance: this.distance,
      tollDistance: this.tollDistance,
      price: this.price,
      basePrice: this.basePrice,
      currencyId: this.currencyId,
      loadingTypeId: this.loadingTypeId,
      unloadingTypeId: this.unloadingTypeId,
      targetDate: this.targetDate,
      additionalExtraDay: this.additionalExtraDay,
      status: this.status,
      isActive: this.isActive,
      privateDate: this.privateDate,
      truckLoadType: this.truckLoadType,
      negotiable: this.negotiable,
      paymentMethods: this.paymentMethods,
      paymentCondition: this.paymentCondition,
      paymentDays: this.paymentDays,
      prePayment: this.prePayment,
      pricePerKm: this.pricePerKm,
      isPricePerKmExceed: this.isPricePerKmExceed,
      priceMode: this.priceMode,
      parentId: this.parentId,
      images: this.images,
      certificates: this.certificates,
      otherDocs: this.otherDocs,
      isSystemLoad: this.isSystemLoad,
      cargos: this.cargos,
      features: this.features,
      documents: this.documents,
    };
  }

  private applySnapshot(snapshot: LoadSnapshot): void {
    this.ownerId = snapshot.ownerId;
    this.companyId = snapshot.companyId;
    this.transportTypeId = snapshot.transportTypeId;
    this.fromLocationId = snapshot.fromLocationId;
    this.toLocationId = snapshot.toLocationId;
    this.fromCountryCode = snapshot.fromCountryCode;
    this.toCountryCode = snapshot.toCountryCode;
    this.distance = snapshot.distance;
    this.tollDistance = snapshot.tollDistance;
    this.price = snapshot.price;
    this.basePrice = snapshot.basePrice;
    this.currencyId = snapshot.currencyId;
    this.loadingTypeId = snapshot.loadingTypeId;
    this.unloadingTypeId = snapshot.unloadingTypeId;
    this.targetDate = snapshot.targetDate;
    this.additionalExtraDay = snapshot.additionalExtraDay;
    this.status = snapshot.status;
    this.isActive = snapshot.isActive;
    this.privateDate = snapshot.privateDate;
    this.truckLoadType = snapshot.truckLoadType;
    this.negotiable = snapshot.negotiable;
    this.paymentMethods = snapshot.paymentMethods;
    this.paymentCondition = snapshot.paymentCondition;
    this.paymentDays = snapshot.paymentDays;
    this.prePayment = snapshot.prePayment;
    this.pricePerKm = snapshot.pricePerKm;
    this.isPricePerKmExceed = snapshot.isPricePerKmExceed;
    this.priceMode = snapshot.priceMode;
    this.parentId = snapshot.parentId;
    this.images = snapshot.images;
    this.certificates = snapshot.certificates;
    this.otherDocs = snapshot.otherDocs;
    this.isSystemLoad = snapshot.isSystemLoad;
    this.cargos = snapshot.cargos;
    this.features = snapshot.features;
    this.documents = snapshot.documents;
  }

  // ==============================================
  // Getters
  // ==============================================

  get aggregateType(): string {
    return 'Load';
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
