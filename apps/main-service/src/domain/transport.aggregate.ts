import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { EVENT_TYPES } from './event.constants';
import {
  CapacityUnit,
  TransportTypeFeature,
  TransportLoadingFeature,
} from './enums';

// ==============================================
// Snapshot Interface
// ==============================================

export interface TransportSnapshot {
  _id: string;
  ownerId: string;
  name?: string;
  transportTypeId: string;
  transportTypeFeature: TransportTypeFeature;
  transportLoadingFeature: TransportLoadingFeature;
  loadingCapacity: number;
  capacity: number;
  capacityUnit: CapacityUnit;
  transportLength?: number;
  transportWidth?: number;
  transportHeight?: number;
  isActive: boolean;
  currencyId?: string;
  loadingTypeIds: string[];
  permitIds: string[];
  adrClassIds: string[];
}

// ==============================================
// Transport Aggregate Root
// ==============================================

export class Transport extends AggregateRoot {
  private ownerId!: string;
  private name?: string;
  private transportTypeId!: string;
  private transportTypeFeature!: TransportTypeFeature;
  private transportLoadingFeature!: TransportLoadingFeature;
  private loadingCapacity!: number;
  private capacity!: number;
  private capacityUnit!: CapacityUnit;
  private transportLength?: number;
  private transportWidth?: number;
  private transportHeight?: number;
  private isActive = true;
  private currencyId?: string;
  private loadingTypeIds: string[] = [];
  private permitIds: string[] = [];
  private adrClassIds: string[] = [];

  // ==============================================
  // Factory Methods
  // ==============================================

  static create(
    transportId: string,
    ownerId: string,
    data: {
      name?: string;
      transportTypeId: string;
      transportTypeFeature: TransportTypeFeature;
      transportLoadingFeature: TransportLoadingFeature;
      loadingCapacity: number;
      capacity: number;
      capacityUnit: CapacityUnit;
      transportLength?: number;
      transportWidth?: number;
      transportHeight?: number;
      currencyId?: string;
      loadingTypeIds?: string[];
      permitIds?: string[];
      adrClassIds?: string[];
    }
  ): Transport {
    const transport = new Transport(transportId);
    const event = transport.createEvent(EVENT_TYPES.TRANSPORT.CREATED, {
      ownerId,
      ...data,
    });
    transport.addEvent(event);
    transport.apply(event);
    return transport;
  }

  static fromEvents(events: DomainEvent[]): Transport {
    if (events.length === 0) {
      throw new Error('Cannot create Transport from empty event list');
    }

    const transport = new Transport(events[0].aggregateId);
    transport.loadFromHistory(events);
    return transport;
  }

  static fromSnapshot(
    snapshotData: TransportSnapshot,
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): Transport {
    const transport = new Transport(snapshotData._id);
    transport.applySnapshot(snapshotData);
    transport._version = snapshotVersion;

    if (subsequentEvents.length > 0) {
      transport.loadFromHistory(subsequentEvents);
    }

    return transport;
  }

  // ==============================================
  // Commands (Business Logic)
  // ==============================================

  updateDetails(data: {
    name?: string;
    transportTypeId?: string;
    transportTypeFeature?: TransportTypeFeature;
    transportLoadingFeature?: TransportLoadingFeature;
    loadingCapacity?: number;
    capacity?: number;
    capacityUnit?: CapacityUnit;
    transportLength?: number;
    transportWidth?: number;
    transportHeight?: number;
    currencyId?: string;
  }): void {
    const event = this.createEvent(EVENT_TYPES.TRANSPORT.UPDATED, data);
    this.addEvent(event);
    this.apply(event);
  }

  addLoadingType(loadingTypeId: string): void {
    if (this.loadingTypeIds.includes(loadingTypeId)) return;

    const event = this.createEvent(EVENT_TYPES.TRANSPORT.LOADING_TYPE_ADDED, {
      loadingTypeId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  removeLoadingType(loadingTypeId: string): void {
    if (!this.loadingTypeIds.includes(loadingTypeId)) return;

    const event = this.createEvent(
      EVENT_TYPES.TRANSPORT.LOADING_TYPE_REMOVED,
      { loadingTypeId }
    );
    this.addEvent(event);
    this.apply(event);
  }

  addPermit(permitId: string): void {
    if (this.permitIds.includes(permitId)) return;

    const event = this.createEvent(EVENT_TYPES.TRANSPORT.PERMIT_ADDED, {
      permitId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  removePermit(permitId: string): void {
    if (!this.permitIds.includes(permitId)) return;

    const event = this.createEvent(EVENT_TYPES.TRANSPORT.PERMIT_REMOVED, {
      permitId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  addAdrClass(adrClassId: string): void {
    if (this.adrClassIds.includes(adrClassId)) return;

    const event = this.createEvent(EVENT_TYPES.TRANSPORT.ADR_CLASS_ADDED, {
      adrClassId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  removeAdrClass(adrClassId: string): void {
    if (!this.adrClassIds.includes(adrClassId)) return;

    const event = this.createEvent(EVENT_TYPES.TRANSPORT.ADR_CLASS_REMOVED, {
      adrClassId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  activate(): void {
    if (this.isActive) return;

    const event = this.createEvent(EVENT_TYPES.TRANSPORT.ACTIVATED, {});
    this.addEvent(event);
    this.apply(event);
  }

  deactivate(): void {
    if (!this.isActive) return;

    const event = this.createEvent(EVENT_TYPES.TRANSPORT.DEACTIVATED, {});
    this.addEvent(event);
    this.apply(event);
  }

  delete(): void {
    const event = this.createEvent(EVENT_TYPES.TRANSPORT.DELETED, {});
    this.addEvent(event);
    this.apply(event);
  }

  // ==============================================
  // Event Handlers (apply)
  // ==============================================

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case EVENT_TYPES.TRANSPORT.CREATED:
        this.applyTransportCreated(event.data);
        break;
      case EVENT_TYPES.TRANSPORT.UPDATED:
        this.applyTransportUpdated(event.data);
        break;
      case EVENT_TYPES.TRANSPORT.LOADING_TYPE_ADDED:
        this.applyLoadingTypeAdded(event.data);
        break;
      case EVENT_TYPES.TRANSPORT.LOADING_TYPE_REMOVED:
        this.applyLoadingTypeRemoved(event.data);
        break;
      case EVENT_TYPES.TRANSPORT.PERMIT_ADDED:
        this.applyPermitAdded(event.data);
        break;
      case EVENT_TYPES.TRANSPORT.PERMIT_REMOVED:
        this.applyPermitRemoved(event.data);
        break;
      case EVENT_TYPES.TRANSPORT.ADR_CLASS_ADDED:
        this.applyAdrClassAdded(event.data);
        break;
      case EVENT_TYPES.TRANSPORT.ADR_CLASS_REMOVED:
        this.applyAdrClassRemoved(event.data);
        break;
      case EVENT_TYPES.TRANSPORT.ACTIVATED:
        this.applyActivated(event.data);
        break;
      case EVENT_TYPES.TRANSPORT.DEACTIVATED:
        this.applyDeactivated(event.data);
        break;
      case EVENT_TYPES.TRANSPORT.DELETED:
        // Handled by projection
        break;
      default:
        // Ignore unknown events
        break;
    }
  }

  private applyTransportCreated(data: any): void {
    this.ownerId = data.ownerId;
    this.name = data.name;
    this.transportTypeId = data.transportTypeId;
    this.transportTypeFeature = data.transportTypeFeature;
    this.transportLoadingFeature = data.transportLoadingFeature;
    this.loadingCapacity = data.loadingCapacity;
    this.capacity = data.capacity;
    this.capacityUnit = data.capacityUnit;
    this.transportLength = data.transportLength;
    this.transportWidth = data.transportWidth;
    this.transportHeight = data.transportHeight;
    this.currencyId = data.currencyId;
    this.loadingTypeIds = data.loadingTypeIds || [];
    this.permitIds = data.permitIds || [];
    this.adrClassIds = data.adrClassIds || [];
    this.isActive = true;
  }

  private applyTransportUpdated(data: any): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.transportTypeId) this.transportTypeId = data.transportTypeId;
    if (data.transportTypeFeature)
      this.transportTypeFeature = data.transportTypeFeature;
    if (data.transportLoadingFeature)
      this.transportLoadingFeature = data.transportLoadingFeature;
    if (data.loadingCapacity !== undefined)
      this.loadingCapacity = data.loadingCapacity;
    if (data.capacity !== undefined) this.capacity = data.capacity;
    if (data.capacityUnit) this.capacityUnit = data.capacityUnit;
    if (data.transportLength !== undefined)
      this.transportLength = data.transportLength;
    if (data.transportWidth !== undefined)
      this.transportWidth = data.transportWidth;
    if (data.transportHeight !== undefined)
      this.transportHeight = data.transportHeight;
    if (data.currencyId !== undefined) this.currencyId = data.currencyId;
  }

  private applyLoadingTypeAdded(data: any): void {
    this.loadingTypeIds.push(data.loadingTypeId);
  }

  private applyLoadingTypeRemoved(data: any): void {
    this.loadingTypeIds = this.loadingTypeIds.filter(
      (id) => id !== data.loadingTypeId
    );
  }

  private applyPermitAdded(data: any): void {
    this.permitIds.push(data.permitId);
  }

  private applyPermitRemoved(data: any): void {
    this.permitIds = this.permitIds.filter((id) => id !== data.permitId);
  }

  private applyAdrClassAdded(data: any): void {
    this.adrClassIds.push(data.adrClassId);
  }

  private applyAdrClassRemoved(data: any): void {
    this.adrClassIds = this.adrClassIds.filter((id) => id !== data.adrClassId);
  }

  private applyActivated(_data: any): void {
    this.isActive = true;
  }

  private applyDeactivated(_data: any): void {
    this.isActive = false;
  }

  // ==============================================
  // Snapshot Support
  // ==============================================

  toSnapshot(): TransportSnapshot {
    return {
      _id: this.id,
      ownerId: this.ownerId,
      name: this.name,
      transportTypeId: this.transportTypeId,
      transportTypeFeature: this.transportTypeFeature,
      transportLoadingFeature: this.transportLoadingFeature,
      loadingCapacity: this.loadingCapacity,
      capacity: this.capacity,
      capacityUnit: this.capacityUnit,
      transportLength: this.transportLength,
      transportWidth: this.transportWidth,
      transportHeight: this.transportHeight,
      isActive: this.isActive,
      currencyId: this.currencyId,
      loadingTypeIds: this.loadingTypeIds,
      permitIds: this.permitIds,
      adrClassIds: this.adrClassIds,
    };
  }

  private applySnapshot(snapshot: TransportSnapshot): void {
    this.ownerId = snapshot.ownerId;
    this.name = snapshot.name;
    this.transportTypeId = snapshot.transportTypeId;
    this.transportTypeFeature = snapshot.transportTypeFeature;
    this.transportLoadingFeature = snapshot.transportLoadingFeature;
    this.loadingCapacity = snapshot.loadingCapacity;
    this.capacity = snapshot.capacity;
    this.capacityUnit = snapshot.capacityUnit;
    this.transportLength = snapshot.transportLength;
    this.transportWidth = snapshot.transportWidth;
    this.transportHeight = snapshot.transportHeight;
    this.isActive = snapshot.isActive;
    this.currencyId = snapshot.currencyId;
    this.loadingTypeIds = snapshot.loadingTypeIds;
    this.permitIds = snapshot.permitIds;
    this.adrClassIds = snapshot.adrClassIds;
  }

  // ==============================================
  // Getters
  // ==============================================

  get aggregateType(): string {
    return 'Transport';
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  getIsActive(): boolean {
    return this.isActive;
  }
}
