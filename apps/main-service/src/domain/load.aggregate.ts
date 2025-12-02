import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { EVENT_TYPES } from './event.constants';
import {
  LoadStatus,
  TruckLoadType,
  PriceMode,
  PaymentMethod,
  WeightUnit,
  LoadDocumentType,
} from './enums';

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
    const event = load.createEvent(EVENT_TYPES.LOAD.CREATED, {
      ownerId,
      ...data,
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
  }): void {
    const event = this.createEvent(EVENT_TYPES.LOAD.UPDATED, data);
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
    const event = this.createEvent(EVENT_TYPES.LOAD.PRICE_UPDATED, data);
    this.addEvent(event);
    this.apply(event);
  }

  changeStatus(status: LoadStatus): void {
    if (this.status === status) return;

    const event = this.createEvent(EVENT_TYPES.LOAD.STATUS_CHANGED, { status });
    this.addEvent(event);
    this.apply(event);
  }

  addCargo(cargo: CargoItem): void {
    const event = this.createEvent(EVENT_TYPES.LOAD.CARGO_ADDED, { cargo });
    this.addEvent(event);
    this.apply(event);
  }

  updateCargo(cargoId: string, updates: Partial<CargoItem>): void {
    const event = this.createEvent(EVENT_TYPES.LOAD.CARGO_UPDATED, {
      cargoId,
      updates,
    });
    this.addEvent(event);
    this.apply(event);
  }

  removeCargo(cargoId: string): void {
    const event = this.createEvent(EVENT_TYPES.LOAD.CARGO_REMOVED, { cargoId });
    this.addEvent(event);
    this.apply(event);
  }

  updateFeatures(features: LoadFeatures): void {
    const event = this.createEvent(EVENT_TYPES.LOAD.FEATURES_UPDATED, {
      features,
    });
    this.addEvent(event);
    this.apply(event);
  }

  addDocument(document: LoadDocument): void {
    const event = this.createEvent(EVENT_TYPES.LOAD.DOCUMENT_ADDED, {
      document,
    });
    this.addEvent(event);
    this.apply(event);
  }

  removeDocument(documentId: string): void {
    const event = this.createEvent(EVENT_TYPES.LOAD.DOCUMENT_REMOVED, {
      documentId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  activate(): void {
    if (this.isActive) return;

    const event = this.createEvent(EVENT_TYPES.LOAD.ACTIVATED, {});
    this.addEvent(event);
    this.apply(event);
  }

  deactivate(): void {
    if (!this.isActive) return;

    const event = this.createEvent(EVENT_TYPES.LOAD.DEACTIVATED, {});
    this.addEvent(event);
    this.apply(event);
  }

  cancel(): void {
    const event = this.createEvent(EVENT_TYPES.LOAD.CANCELLED, {});
    this.addEvent(event);
    this.apply(event);
  }

  complete(): void {
    const event = this.createEvent(EVENT_TYPES.LOAD.COMPLETED, {});
    this.addEvent(event);
    this.apply(event);
  }

  delete(): void {
    const event = this.createEvent(EVENT_TYPES.LOAD.DELETED, {});
    this.addEvent(event);
    this.apply(event);
  }

  // ==============================================
  // Event Handlers (apply)
  // ==============================================

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case EVENT_TYPES.LOAD.CREATED:
        this.applyLoadCreated(event.data);
        break;
      case EVENT_TYPES.LOAD.UPDATED:
        this.applyLoadUpdated(event.data);
        break;
      case EVENT_TYPES.LOAD.STATUS_CHANGED:
        this.applyStatusChanged(event.data);
        break;
      case EVENT_TYPES.LOAD.PRICE_UPDATED:
        this.applyPriceUpdated(event.data);
        break;
      case EVENT_TYPES.LOAD.CARGO_ADDED:
        this.applyCargoAdded(event.data);
        break;
      case EVENT_TYPES.LOAD.CARGO_UPDATED:
        this.applyCargoUpdated(event.data);
        break;
      case EVENT_TYPES.LOAD.CARGO_REMOVED:
        this.applyCargoRemoved(event.data);
        break;
      case EVENT_TYPES.LOAD.FEATURES_UPDATED:
        this.applyFeaturesUpdated(event.data);
        break;
      case EVENT_TYPES.LOAD.DOCUMENT_ADDED:
        this.applyDocumentAdded(event.data);
        break;
      case EVENT_TYPES.LOAD.DOCUMENT_REMOVED:
        this.applyDocumentRemoved(event.data);
        break;
      case EVENT_TYPES.LOAD.ACTIVATED:
        this.applyActivated(event.data);
        break;
      case EVENT_TYPES.LOAD.DEACTIVATED:
        this.applyDeactivated(event.data);
        break;
      case EVENT_TYPES.LOAD.CANCELLED:
        this.applyCancelled(event.data);
        break;
      case EVENT_TYPES.LOAD.COMPLETED:
        this.applyCompleted(event.data);
        break;
      case EVENT_TYPES.LOAD.DELETED:
        // Handled by projection
        break;
      default:
        // Ignore unknown events
        break;
    }
  }

  private applyLoadCreated(data: any): void {
    this.ownerId = data.ownerId;
    this.companyId = data.companyId;
    this.transportTypeId = data.transportTypeId;
    this.fromLocationId = data.fromLocationId;
    this.toLocationId = data.toLocationId;
    this.fromCountryCode = data.fromCountryCode;
    this.toCountryCode = data.toCountryCode;
    this.currencyId = data.currencyId;
    this.loadingTypeId = data.loadingTypeId;
    this.unloadingTypeId = data.unloadingTypeId;
    this.targetDate = new Date(data.targetDate);
    this.truckLoadType = data.truckLoadType || TruckLoadType.FTL;
    this.negotiable = data.negotiable || false;
    this.paymentMethods = data.paymentMethods || [];
    this.paymentCondition = data.paymentCondition || false;
    this.paymentDays = data.paymentDays || 0;
    this.prePayment = data.prePayment || 0;
    this.price = data.price;
    this.basePrice = data.basePrice || 0;
    this.pricePerKm = data.pricePerKm || 0;
    this.priceMode = data.priceMode;
    this.distance = data.distance;
    this.tollDistance = data.tollDistance;
    this.additionalExtraDay = data.additionalExtraDay
      ? new Date(data.additionalExtraDay)
      : undefined;
    this.privateDate = data.privateDate
      ? new Date(data.privateDate)
      : undefined;
    this.parentId = data.parentId;
    this.isSystemLoad = data.isSystemLoad || false;
    this.status = LoadStatus.OPEN;
    this.isActive = true;
  }

  private applyLoadUpdated(data: any): void {
    if (data.transportTypeId) this.transportTypeId = data.transportTypeId;
    if (data.fromLocationId) this.fromLocationId = data.fromLocationId;
    if (data.toLocationId) this.toLocationId = data.toLocationId;
    if (data.fromCountryCode) this.fromCountryCode = data.fromCountryCode;
    if (data.toCountryCode) this.toCountryCode = data.toCountryCode;
    if (data.loadingTypeId) this.loadingTypeId = data.loadingTypeId;
    if (data.unloadingTypeId) this.unloadingTypeId = data.unloadingTypeId;
    if (data.targetDate) this.targetDate = new Date(data.targetDate);
    if (data.additionalExtraDay)
      this.additionalExtraDay = new Date(data.additionalExtraDay);
    if (data.truckLoadType) this.truckLoadType = data.truckLoadType;
    if (data.negotiable !== undefined) this.negotiable = data.negotiable;
    if (data.paymentMethods) this.paymentMethods = data.paymentMethods;
    if (data.paymentCondition !== undefined)
      this.paymentCondition = data.paymentCondition;
    if (data.paymentDays !== undefined) this.paymentDays = data.paymentDays;
    if (data.prePayment !== undefined) this.prePayment = data.prePayment;
    if (data.distance !== undefined) this.distance = data.distance;
    if (data.tollDistance !== undefined) this.tollDistance = data.tollDistance;
  }

  private applyStatusChanged(data: any): void {
    this.status = data.status;
  }

  private applyPriceUpdated(data: any): void {
    if (data.price !== undefined) this.price = data.price;
    if (data.basePrice !== undefined) this.basePrice = data.basePrice;
    if (data.pricePerKm !== undefined) this.pricePerKm = data.pricePerKm;
    if (data.isPricePerKmExceed !== undefined)
      this.isPricePerKmExceed = data.isPricePerKmExceed;
    if (data.priceMode !== undefined) this.priceMode = data.priceMode;
  }

  private applyCargoAdded(data: any): void {
    this.cargos.push(data.cargo);
  }

  private applyCargoUpdated(data: any): void {
    const index = this.cargos.findIndex((c) => c.id === data.cargoId);
    if (index !== -1) {
      this.cargos[index] = { ...this.cargos[index], ...data.updates };
    }
  }

  private applyCargoRemoved(data: any): void {
    this.cargos = this.cargos.filter((c) => c.id !== data.cargoId);
  }

  private applyFeaturesUpdated(data: any): void {
    this.features = data.features;
  }

  private applyDocumentAdded(data: any): void {
    this.documents.push(data.document);
  }

  private applyDocumentRemoved(data: any): void {
    this.documents = this.documents.filter((d) => d.id !== data.documentId);
  }

  private applyActivated(_data: any): void {
    this.isActive = true;
  }

  private applyDeactivated(_data: any): void {
    this.isActive = false;
  }

  private applyCancelled(_data: any): void {
    this.status = LoadStatus.CANCELLED;
  }

  private applyCompleted(_data: any): void {
    this.status = LoadStatus.COMPLETED;
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
