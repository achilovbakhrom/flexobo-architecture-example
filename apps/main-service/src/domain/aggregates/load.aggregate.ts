import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  LOAD_EVENT_TYPES,
  LoadCreatedEventData,
  LoadUpdatedEventData,
  LoadStatusChangedEventData,
  LoadDeletedEventData,
  CargoData,
  LocationData,
} from '../events/load.events';
import { LoadStatus } from '../constants/enums';

export interface LoadState {
  ownerId: string;
  companyId: string;
  status: LoadStatus;
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
  isDeleted: boolean;
}

export class Load extends AggregateRoot {
  private ownerId!: string;
  private companyId!: string;
  private status: LoadStatus = LoadStatus.DRAFT;
  private from!: LocationData;
  private to!: LocationData;
  private transportType!: string;
  private loadingTypes: string[] = [];
  private cargos: CargoData[] = [];
  private totalWeight!: number;
  private totalVolume?: number;
  private features: string[] = [];
  private adrClasses: string[] = [];
  private temperatureMin?: number;
  private temperatureMax?: number;
  private price?: number;
  private currency = 'USD';
  private paymentTerms?: string;
  private loadingDate!: string;
  private loadingDateTo?: string;
  private unloadingDate?: string;
  private boardIds: string[] = [];
  private isPublic = true;
  private isDeleted = false;

  static create(loadId: string, data: LoadCreatedEventData): Load {
    const load = new Load(loadId);

    const event = load.createEvent(LOAD_EVENT_TYPES.CREATED, data);
    load.addEvent(event);
    load.apply(event);

    return load;
  }

  static fromEvents(events: DomainEvent[]): Load {
    if (events.length === 0) {
      throw new Error('Cannot create Load from empty events');
    }
    const load = new Load(events[0].aggregateId);
    load.loadFromHistory(events);
    return load;
  }

  update(data: LoadUpdatedEventData): void {
    if (this.isDeleted) {
      throw new Error('Cannot update deleted load');
    }

    if (this.status !== LoadStatus.DRAFT && this.status !== LoadStatus.ACTIVE) {
      throw new Error('Can only update draft or active loads');
    }

    const event = this.createEvent(LOAD_EVENT_TYPES.UPDATED, data);
    this.addEvent(event);
    this.apply(event);
  }

  activate(userId: string): void {
    if (this.isDeleted) {
      throw new Error('Cannot activate deleted load');
    }

    if (this.status !== LoadStatus.DRAFT) {
      throw new Error('Can only activate draft loads');
    }

    const event = this.createEvent<
      typeof LOAD_EVENT_TYPES.STATUS_CHANGED,
      LoadStatusChangedEventData
    >(LOAD_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: LoadStatus.ACTIVE,
      changedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  markBooked(userId: string): void {
    if (this.isDeleted) {
      throw new Error('Cannot book deleted load');
    }

    if (this.status !== LoadStatus.ACTIVE) {
      throw new Error('Can only book active loads');
    }

    const event = this.createEvent<
      typeof LOAD_EVENT_TYPES.STATUS_CHANGED,
      LoadStatusChangedEventData
    >(LOAD_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: LoadStatus.BOOKED,
      changedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  complete(userId: string): void {
    if (this.isDeleted) {
      throw new Error('Cannot complete deleted load');
    }

    if (this.status !== LoadStatus.BOOKED) {
      throw new Error('Can only complete booked loads');
    }

    const event = this.createEvent<
      typeof LOAD_EVENT_TYPES.STATUS_CHANGED,
      LoadStatusChangedEventData
    >(LOAD_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: LoadStatus.COMPLETED,
      changedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  cancel(userId: string, reason?: string): void {
    if (this.isDeleted) {
      throw new Error('Cannot cancel deleted load');
    }

    if (
      this.status === LoadStatus.COMPLETED ||
      this.status === LoadStatus.CANCELLED
    ) {
      throw new Error('Cannot cancel completed or already cancelled loads');
    }

    const event = this.createEvent<
      typeof LOAD_EVENT_TYPES.STATUS_CHANGED,
      LoadStatusChangedEventData
    >(LOAD_EVENT_TYPES.STATUS_CHANGED, {
      previousStatus: this.status,
      newStatus: LoadStatus.CANCELLED,
      changedBy: userId,
      reason,
    });
    this.addEvent(event);
    this.apply(event);
  }

  delete(userId: string): void {
    if (this.isDeleted) {
      throw new Error('Load is already deleted');
    }

    if (this.status === LoadStatus.BOOKED) {
      throw new Error('Cannot delete booked load');
    }

    const event = this.createEvent<
      typeof LOAD_EVENT_TYPES.DELETED,
      LoadDeletedEventData
    >(LOAD_EVENT_TYPES.DELETED, {
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  getState(): LoadState {
    return {
      ownerId: this.ownerId,
      companyId: this.companyId,
      status: this.status,
      from: { ...this.from },
      to: { ...this.to },
      transportType: this.transportType,
      loadingTypes: [...this.loadingTypes],
      cargos: this.cargos.map((c) => ({ ...c })),
      totalWeight: this.totalWeight,
      totalVolume: this.totalVolume,
      features: [...this.features],
      adrClasses: [...this.adrClasses],
      temperatureMin: this.temperatureMin,
      temperatureMax: this.temperatureMax,
      price: this.price,
      currency: this.currency,
      paymentTerms: this.paymentTerms,
      loadingDate: this.loadingDate,
      loadingDateTo: this.loadingDateTo,
      unloadingDate: this.unloadingDate,
      boardIds: [...this.boardIds],
      isPublic: this.isPublic,
      isDeleted: this.isDeleted,
    };
  }

  getDetails() {
    return {
      id: this.id,
      ...this.getState(),
      version: this.version,
    };
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case LOAD_EVENT_TYPES.CREATED:
        this.applyCreated(event.data as LoadCreatedEventData);
        break;
      case LOAD_EVENT_TYPES.UPDATED:
        this.applyUpdated(event.data as LoadUpdatedEventData);
        break;
      case LOAD_EVENT_TYPES.STATUS_CHANGED:
        this.applyStatusChanged(event.data as LoadStatusChangedEventData);
        break;
      case LOAD_EVENT_TYPES.DELETED:
        this.applyDeleted();
        break;
    }
  }

  private applyCreated(data: LoadCreatedEventData): void {
    this.ownerId = data.ownerId;
    this.companyId = data.companyId;
    this.status = LoadStatus.DRAFT;
    this.from = data.from;
    this.to = data.to;
    this.transportType = data.transportType;
    this.loadingTypes = data.loadingTypes;
    this.cargos = data.cargos;
    this.totalWeight = data.totalWeight;
    this.totalVolume = data.totalVolume;
    this.features = data.features;
    this.adrClasses = data.adrClasses;
    this.temperatureMin = data.temperatureMin;
    this.temperatureMax = data.temperatureMax;
    this.price = data.price;
    this.currency = data.currency;
    this.paymentTerms = data.paymentTerms;
    this.loadingDate = data.loadingDate;
    this.loadingDateTo = data.loadingDateTo;
    this.unloadingDate = data.unloadingDate;
    this.boardIds = data.boardIds;
    this.isPublic = data.isPublic;
    this.isDeleted = false;
  }

  private applyUpdated(data: LoadUpdatedEventData): void {
    if (data.from !== undefined) this.from = data.from;
    if (data.to !== undefined) this.to = data.to;
    if (data.transportType !== undefined)
      this.transportType = data.transportType;
    if (data.loadingTypes !== undefined) this.loadingTypes = data.loadingTypes;
    if (data.cargos !== undefined) this.cargos = data.cargos;
    if (data.totalWeight !== undefined) this.totalWeight = data.totalWeight;
    if (data.totalVolume !== undefined) this.totalVolume = data.totalVolume;
    if (data.features !== undefined) this.features = data.features;
    if (data.adrClasses !== undefined) this.adrClasses = data.adrClasses;
    if (data.temperatureMin !== undefined)
      this.temperatureMin = data.temperatureMin;
    if (data.temperatureMax !== undefined)
      this.temperatureMax = data.temperatureMax;
    if (data.price !== undefined) this.price = data.price;
    if (data.currency !== undefined) this.currency = data.currency;
    if (data.paymentTerms !== undefined) this.paymentTerms = data.paymentTerms;
    if (data.loadingDate !== undefined) this.loadingDate = data.loadingDate;
    if (data.loadingDateTo !== undefined)
      this.loadingDateTo = data.loadingDateTo;
    if (data.unloadingDate !== undefined)
      this.unloadingDate = data.unloadingDate;
    if (data.boardIds !== undefined) this.boardIds = data.boardIds;
    if (data.isPublic !== undefined) this.isPublic = data.isPublic;
  }

  private applyStatusChanged(data: LoadStatusChangedEventData): void {
    this.status = data.newStatus as LoadStatus;
  }

  private applyDeleted(): void {
    this.isDeleted = true;
    this.status = LoadStatus.CANCELLED;
  }
}
