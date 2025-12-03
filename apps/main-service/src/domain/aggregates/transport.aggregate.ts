import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  TRANSPORT_EVENT_TYPES,
  TransportCreatedEventData,
  TransportUpdatedEventData,
  TransportDeletedEventData,
} from '../events/transport.events';
import { TransportType, LoadingType, Feature } from '../constants/enums';

export interface TransportState {
  ownerId: string;
  companyId: string;
  transportType: string;
  loadingTypes: string[];
  capacityTons: number;
  capacityM3?: number;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  features: string[];
  adrClasses: string[];
  permits: string[];
  isActive: boolean;
  isDeleted: boolean;
}

export class Transport extends AggregateRoot {
  private ownerId!: string;
  private companyId!: string;
  private transportType!: string;
  private loadingTypes: string[] = [];
  private capacityTons!: number;
  private capacityM3?: number;
  private lengthM?: number;
  private widthM?: number;
  private heightM?: number;
  private features: string[] = [];
  private adrClasses: string[] = [];
  private permits: string[] = [];
  private isActive = true;
  private isDeleted = false;

  static create(
    transportId: string,
    data: TransportCreatedEventData
  ): Transport {
    const transport = new Transport(transportId);

    const event = transport.createEvent(TRANSPORT_EVENT_TYPES.CREATED, data);
    transport.addEvent(event);
    transport.apply(event);

    return transport;
  }

  static fromEvents(events: DomainEvent[]): Transport {
    if (events.length === 0) {
      throw new Error('Cannot create Transport from empty events');
    }
    const transport = new Transport(events[0].aggregateId);
    transport.loadFromHistory(events);
    return transport;
  }

  update(data: TransportUpdatedEventData): void {
    if (this.isDeleted) {
      throw new Error('Cannot update deleted transport');
    }

    const event = this.createEvent(TRANSPORT_EVENT_TYPES.UPDATED, data);
    this.addEvent(event);
    this.apply(event);
  }

  deactivate(): void {
    if (this.isDeleted) {
      throw new Error('Cannot deactivate deleted transport');
    }

    if (!this.isActive) {
      throw new Error('Transport is already inactive');
    }

    const event = this.createEvent(TRANSPORT_EVENT_TYPES.UPDATED, {
      isActive: false,
    });
    this.addEvent(event);
    this.apply(event);
  }

  activate(): void {
    if (this.isDeleted) {
      throw new Error('Cannot activate deleted transport');
    }

    if (this.isActive) {
      throw new Error('Transport is already active');
    }

    const event = this.createEvent(TRANSPORT_EVENT_TYPES.UPDATED, {
      isActive: true,
    });
    this.addEvent(event);
    this.apply(event);
  }

  delete(): void {
    if (this.isDeleted) {
      throw new Error('Transport is already deleted');
    }

    const event = this.createEvent<
      typeof TRANSPORT_EVENT_TYPES.DELETED,
      TransportDeletedEventData
    >(TRANSPORT_EVENT_TYPES.DELETED, {
      deletedAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  getState(): TransportState {
    return {
      ownerId: this.ownerId,
      companyId: this.companyId,
      transportType: this.transportType,
      loadingTypes: [...this.loadingTypes],
      capacityTons: this.capacityTons,
      capacityM3: this.capacityM3,
      lengthM: this.lengthM,
      widthM: this.widthM,
      heightM: this.heightM,
      features: [...this.features],
      adrClasses: [...this.adrClasses],
      permits: [...this.permits],
      isActive: this.isActive,
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
      case TRANSPORT_EVENT_TYPES.CREATED:
        this.applyCreated(event.data as TransportCreatedEventData);
        break;
      case TRANSPORT_EVENT_TYPES.UPDATED:
        this.applyUpdated(event.data as TransportUpdatedEventData);
        break;
      case TRANSPORT_EVENT_TYPES.DELETED:
        this.applyDeleted();
        break;
    }
  }

  private applyCreated(data: TransportCreatedEventData): void {
    this.ownerId = data.ownerId;
    this.companyId = data.companyId;
    this.transportType = data.transportType;
    this.loadingTypes = data.loadingTypes;
    this.capacityTons = data.capacityTons;
    this.capacityM3 = data.capacityM3;
    this.lengthM = data.lengthM;
    this.widthM = data.widthM;
    this.heightM = data.heightM;
    this.features = data.features;
    this.adrClasses = data.adrClasses;
    this.permits = data.permits;
    this.isActive = true;
    this.isDeleted = false;
  }

  private applyUpdated(data: TransportUpdatedEventData): void {
    if (data.transportType !== undefined) {
      this.transportType = data.transportType;
    }
    if (data.loadingTypes !== undefined) {
      this.loadingTypes = data.loadingTypes;
    }
    if (data.capacityTons !== undefined) {
      this.capacityTons = data.capacityTons;
    }
    if (data.capacityM3 !== undefined) {
      this.capacityM3 = data.capacityM3;
    }
    if (data.lengthM !== undefined) {
      this.lengthM = data.lengthM;
    }
    if (data.widthM !== undefined) {
      this.widthM = data.widthM;
    }
    if (data.heightM !== undefined) {
      this.heightM = data.heightM;
    }
    if (data.features !== undefined) {
      this.features = data.features;
    }
    if (data.adrClasses !== undefined) {
      this.adrClasses = data.adrClasses;
    }
    if (data.permits !== undefined) {
      this.permits = data.permits;
    }
    if (data.isActive !== undefined) {
      this.isActive = data.isActive;
    }
  }

  private applyDeleted(): void {
    this.isDeleted = true;
    this.isActive = false;
  }
}
