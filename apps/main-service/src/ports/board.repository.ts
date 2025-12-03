import { IAggregateStore } from '@flexobo/core';
import { Board } from '../domain/aggregates/board.aggregate';
import { BoardMemberData } from '../domain/events/board.events';

export const BOARD_AGGREGATE_STORE = Symbol('BOARD_AGGREGATE_STORE');
export const BOARD_READ_REPOSITORY = Symbol('BOARD_READ_REPOSITORY');

export type IBoardAggregateStore = IAggregateStore<Board>;

export interface BoardReadDto {
  id: string;
  ownerId: string;
  companyId: string;
  name: string;
  description?: string;
  members: BoardMemberData[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardFilters {
  isActive?: boolean;
  offset?: number;
  limit?: number;
}

export interface IBoardReadRepository {
  findById(id: string): Promise<BoardReadDto | null>;
  findByOwner(ownerId: string, filters?: BoardFilters): Promise<BoardReadDto[]>;
  findByMember(userId: string, filters?: BoardFilters): Promise<BoardReadDto[]>;
  findByCompany(companyId: string, filters?: BoardFilters): Promise<BoardReadDto[]>;
  countByOwner(ownerId: string, filters?: BoardFilters): Promise<number>;
  countByMember(userId: string, filters?: BoardFilters): Promise<number>;
  save(board: BoardReadDto): Promise<void>;
  delete(id: string): Promise<void>;
}
