export const LANGUAGE_EVENT_TYPES = {
  CREATED: 'language.created',
  UPDATED: 'language.updated',
  DELETED: 'language.deleted',
} as const;

export interface LanguageCreatedEventData extends Record<string, unknown> {
  name: string;
  code: string;
  isActive: boolean;
  createdBy?: string;
}

export interface LanguageUpdatedEventData extends Record<string, unknown> {
  name?: string;
  code?: string;
  isActive?: boolean;
  updatedBy?: string;
}

export interface LanguageDeletedEventData extends Record<string, unknown> {
  deletedAt: string;
  deletedBy: string;
}
