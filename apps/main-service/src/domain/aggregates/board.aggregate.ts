import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  BOARD_EVENT_TYPES,
  BoardCreatedEventData,
  BoardUpdatedEventData,
  BoardMemberAddedEventData,
  BoardMemberRemovedEventData,
  BoardDeletedEventData,
  BoardMemberData,
} from '../events/board.events';

export interface BoardState {
  ownerId: string;
  companyId: string;
  name: string;
  description?: string;
  members: BoardMemberData[];
  isActive: boolean;
  isDeleted: boolean;
}

export class Board extends AggregateRoot {
  private ownerId!: string;
  private companyId!: string;
  private name!: string;
  private description?: string;
  private members: BoardMemberData[] = [];
  private isActive: boolean = true;
  private isDeleted: boolean = false;

  static create(boardId: string, data: BoardCreatedEventData): Board {
    const board = new Board(boardId);
    const event = board.createEvent(BOARD_EVENT_TYPES.CREATED, data);
    board.addEvent(event);
    board.apply(event);
    return board;
  }

  static fromEvents(events: DomainEvent[]): Board {
    if (events.length === 0) {
      throw new Error('Cannot create Board from empty events');
    }
    const board = new Board(events[0].aggregateId);
    board.loadFromHistory(events);
    return board;
  }

  update(data: BoardUpdatedEventData): void {
    if (this.isDeleted) throw new Error('Cannot update deleted board');
    const event = this.createEvent(BOARD_EVENT_TYPES.UPDATED, data);
    this.addEvent(event);
    this.apply(event);
  }

  addMember(userId: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER', addedBy: string): void {
    if (this.isDeleted) throw new Error('Cannot add member to deleted board');
    if (this.members.some((m) => m.userId === userId)) {
      throw new Error('User is already a member of this board');
    }
    const event = this.createEvent<
      typeof BOARD_EVENT_TYPES.MEMBER_ADDED,
      BoardMemberAddedEventData
    >(BOARD_EVENT_TYPES.MEMBER_ADDED, {
      userId,
      role,
      addedBy,
    });
    this.addEvent(event);
    this.apply(event);
  }

  removeMember(userId: string, removedBy: string): void {
    if (this.isDeleted) throw new Error('Cannot remove member from deleted board');
    if (!this.members.some((m) => m.userId === userId)) {
      throw new Error('User is not a member of this board');
    }
    if (userId === this.ownerId) {
      throw new Error('Cannot remove the board owner');
    }
    const event = this.createEvent<
      typeof BOARD_EVENT_TYPES.MEMBER_REMOVED,
      BoardMemberRemovedEventData
    >(BOARD_EVENT_TYPES.MEMBER_REMOVED, {
      userId,
      removedBy,
    });
    this.addEvent(event);
    this.apply(event);
  }

  delete(userId: string): void {
    if (this.isDeleted) throw new Error('Board is already deleted');
    if (userId !== this.ownerId) {
      throw new Error('Only the owner can delete the board');
    }
    const event = this.createEvent<
      typeof BOARD_EVENT_TYPES.DELETED,
      BoardDeletedEventData
    >(BOARD_EVENT_TYPES.DELETED, {
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
    });
    this.addEvent(event);
    this.apply(event);
  }

  getState(): BoardState {
    return {
      ownerId: this.ownerId,
      companyId: this.companyId,
      name: this.name,
      description: this.description,
      members: this.members.map((m) => ({ ...m })),
      isActive: this.isActive,
      isDeleted: this.isDeleted,
    };
  }

  getDetails() {
    return { id: this.id, ...this.getState(), version: this.version };
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case BOARD_EVENT_TYPES.CREATED:
        this.applyCreated(event.data as BoardCreatedEventData);
        break;
      case BOARD_EVENT_TYPES.UPDATED:
        this.applyUpdated(event.data as BoardUpdatedEventData);
        break;
      case BOARD_EVENT_TYPES.MEMBER_ADDED:
        this.applyMemberAdded(event.data as BoardMemberAddedEventData);
        break;
      case BOARD_EVENT_TYPES.MEMBER_REMOVED:
        this.applyMemberRemoved(event.data as BoardMemberRemovedEventData);
        break;
      case BOARD_EVENT_TYPES.DELETED:
        this.isDeleted = true;
        this.isActive = false;
        break;
    }
  }

  private applyCreated(data: BoardCreatedEventData): void {
    this.ownerId = data.ownerId;
    this.companyId = data.companyId;
    this.name = data.name;
    this.description = data.description;
    this.members = [{ userId: data.ownerId, role: 'ADMIN' }];
    this.isActive = true;
  }

  private applyUpdated(data: BoardUpdatedEventData): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.description !== undefined) this.description = data.description;
    if (data.isActive !== undefined) this.isActive = data.isActive;
  }

  private applyMemberAdded(data: BoardMemberAddedEventData): void {
    this.members.push({ userId: data.userId, role: data.role });
  }

  private applyMemberRemoved(data: BoardMemberRemovedEventData): void {
    this.members = this.members.filter((m) => m.userId !== data.userId);
  }
}
