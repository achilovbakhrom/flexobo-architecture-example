export const BOARD_EVENT_TYPES = {
  CREATED: 'board.created',
  UPDATED: 'board.updated',
  MEMBER_ADDED: 'board.member_added',
  MEMBER_REMOVED: 'board.member_removed',
  DELETED: 'board.deleted',
} as const;

export interface BoardMemberData {
  userId: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface BoardCreatedEventData extends Record<string, unknown> {
  ownerId: string;
  companyId: string;
  name: string;
  description?: string;
}

export interface BoardUpdatedEventData extends Record<string, unknown> {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface BoardMemberAddedEventData extends Record<string, unknown> {
  userId: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  addedBy: string;
}

export interface BoardMemberRemovedEventData extends Record<string, unknown> {
  userId: string;
  removedBy: string;
}

export interface BoardDeletedEventData extends Record<string, unknown> {
  deletedAt: string;
  deletedBy: string;
}
