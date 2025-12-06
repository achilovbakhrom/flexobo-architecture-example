import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  LANGUAGE_EVENT_TYPES,
  LanguageCreatedEventData,
  LanguageDeletedEventData,
  LanguageUpdatedEventData,
} from '../events/language.events';

export interface LanguageState {
  name: string;
  code: string;
  isActive: boolean;
  isDeleted: boolean;
}

export class Language extends AggregateRoot {
  private name!: string;
  private code!: string;
  private isActive = false;
  private isDeleted = false;

  static create(id: string, data: LanguageCreatedEventData): Language {
    const language = new Language(id);
    const event = language.createEvent(LANGUAGE_EVENT_TYPES.CREATED, data);
    language.addEvent(event);
    language.apply(event);
    return language;
  }

  static fromEvents(events: DomainEvent[]): Language {
    if (events.length === 0) {
      throw new Error('Cannot create Language from empty events');
    }
    const language = new Language(events[0].aggregateId);
    language.loadFromHistory(events);
    return language;
  }

  update(data: LanguageUpdatedEventData): void {
    if (this.isDeleted) {
      throw new Error('Cannot update deleted language');
    }

    const event = this.createEvent(LANGUAGE_EVENT_TYPES.UPDATED, data);
    this.addEvent(event);
    this.apply(event);
  }

  delete(deletedBy: string): void {
    if (this.isDeleted) {
      throw new Error('Language is already deleted');
    }

    const event = this.createEvent<
      typeof LANGUAGE_EVENT_TYPES.DELETED,
      LanguageDeletedEventData
    >(LANGUAGE_EVENT_TYPES.DELETED, {
      deletedAt: new Date().toISOString(),
      deletedBy,
    });
    this.addEvent(event);
    this.apply(event);
  }

  getState(): LanguageState {
    return {
      name: this.name,
      code: this.code,
      isActive: this.isActive,
      isDeleted: this.isDeleted,
    };
  }

  getDetails() {
    return { id: this.id, ...this.getState(), version: this.version };
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case LANGUAGE_EVENT_TYPES.CREATED:
        this.applyCreated(event.data as LanguageCreatedEventData);
        break;
      case LANGUAGE_EVENT_TYPES.UPDATED:
        this.applyUpdated(event.data as LanguageUpdatedEventData);
        break;
      case LANGUAGE_EVENT_TYPES.DELETED:
        this.applyDeleted();
        break;
    }
  }

  private applyCreated(data: LanguageCreatedEventData): void {
    this.name = data.name;
    this.code = data.code;
    this.isActive = data.isActive;
    this.isDeleted = false;
  }

  private applyUpdated(data: LanguageUpdatedEventData): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.code !== undefined) this.code = data.code;
    if (data.isActive !== undefined) this.isActive = data.isActive;
  }

  private applyDeleted(): void {
    this.isDeleted = true;
    this.isActive = false;
  }
}
