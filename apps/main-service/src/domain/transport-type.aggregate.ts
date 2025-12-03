import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  TransportTypeEvent,
  TransportTypeEventType,
  TransportTypeTranslationData,
} from './events/transport-type.events';

// ==============================================
// Snapshot Interface
// ==============================================

export interface TransportTypeSnapshot {
  _id: string;
  isActive: boolean;
  translations: Map<string, TransportTypeTranslationData>;
}

// ==============================================
// Transport Type Aggregate Root
// ==============================================

export class TransportType extends AggregateRoot {
  private isActive = true;
  private translations: Map<string, TransportTypeTranslationData> = new Map();

  // ==============================================
  // Factory Methods
  // ==============================================

  static create(
    transportTypeId: string,
    data: {
      isActive?: boolean;
      translations: TransportTypeTranslationData[];
    }
  ): TransportType {
    const transportType = new TransportType(transportTypeId);
    const event = transportType.createEvent(TransportTypeEventType.Created, {
      isActive: data.isActive ?? true,
      translations: data.translations,
      createdAt: new Date(),
    });
    transportType.addEvent(event);
    transportType.apply(event);
    return transportType;
  }

  static fromEvents(events: DomainEvent[]): TransportType {
    if (events.length === 0) {
      throw new Error('Cannot create TransportType from empty event list');
    }

    const transportType = new TransportType(events[0].aggregateId);
    transportType.loadFromHistory(events);
    return transportType;
  }

  static fromSnapshot(
    snapshotData: TransportTypeSnapshot,
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): TransportType {
    const transportType = new TransportType(snapshotData._id);
    transportType.applySnapshot(snapshotData);
    transportType._version = snapshotVersion;

    if (subsequentEvents.length > 0) {
      transportType.loadFromHistory(subsequentEvents);
    }

    return transportType;
  }

  // ==============================================
  // Commands (Business Logic)
  // ==============================================

  update(data: { isActive?: boolean }): void {
    const event = this.createEvent(TransportTypeEventType.Updated, {
      isActive: data.isActive,
      updatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  activate(): void {
    if (this.isActive) return;

    const event = this.createEvent(TransportTypeEventType.Activated, {
      activatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  deactivate(): void {
    if (!this.isActive) return;

    const event = this.createEvent(TransportTypeEventType.Deactivated, {
      deactivatedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  addTranslation(translation: TransportTypeTranslationData): void {
    if (this.translations.has(translation.language)) {
      throw new Error(
        `Translation for language ${translation.language} already exists`
      );
    }

    const event = this.createEvent(TransportTypeEventType.TranslationAdded, {
      translation,
      addedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  updateTranslation(
    language: string,
    data: { name?: string; description?: string }
  ): void {
    if (!this.translations.has(language)) {
      throw new Error(`Translation for language ${language} not found`);
    }

    const event = this.createEvent(
      TransportTypeEventType.TranslationUpdated,
      {
        language,
        name: data.name,
        description: data.description,
        updatedAt: new Date(),
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  deleteTranslation(language: string): void {
    if (!this.translations.has(language)) {
      throw new Error(`Translation for language ${language} not found`);
    }

    const event = this.createEvent(
      TransportTypeEventType.TranslationDeleted,
      {
        language,
        deletedAt: new Date(),
      }
    );
    this.addEvent(event);
    this.apply(event);
  }

  delete(): void {
    const event = this.createEvent(TransportTypeEventType.Deleted, {
      deletedAt: new Date(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  // ==============================================
  // Event Handlers (apply)
  // ==============================================

  protected apply(event: DomainEvent<TransportTypeEvent>): void {
    switch (event.type) {
      case TransportTypeEventType.Created:
        this.isActive = event.data.isActive;
        event.data.translations.forEach((translation) => {
          this.translations.set(translation.language, translation);
        });
        break;

      case TransportTypeEventType.Updated:
        if (event.data.isActive !== undefined) {
          this.isActive = event.data.isActive;
        }
        break;

      case TransportTypeEventType.Activated:
        this.isActive = true;
        break;

      case TransportTypeEventType.Deactivated:
        this.isActive = false;
        break;

      case TransportTypeEventType.TranslationAdded:
        this.translations.set(
          event.data.translation.language,
          event.data.translation
        );
        break;

      case TransportTypeEventType.TranslationUpdated: {
        const existing = this.translations.get(event.data.language);
        if (existing) {
          this.translations.set(event.data.language, {
            language: event.data.language,
            name: event.data.name ?? existing.name,
            description: event.data.description ?? existing.description,
          });
        }
        break;
      }

      case TransportTypeEventType.TranslationDeleted:
        this.translations.delete(event.data.language);
        break;

      case TransportTypeEventType.Deleted:
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

  toSnapshot(): TransportTypeSnapshot {
    return {
      _id: this.id,
      isActive: this.isActive,
      translations: this.translations,
    };
  }

  private applySnapshot(snapshot: TransportTypeSnapshot): void {
    this.isActive = snapshot.isActive;
    this.translations = new Map(snapshot.translations);
  }

  // ==============================================
  // Getters (for read-only access)
  // ==============================================

  get isActiveSafe(): boolean {
    return this.isActive;
  }

  get translationsSafe(): Map<string, TransportTypeTranslationData> {
    return new Map(this.translations);
  }

  getTranslation(language: string): TransportTypeTranslationData | undefined {
    return this.translations.get(language);
  }

  hasTranslation(language: string): boolean {
    return this.translations.has(language);
  }
}
